"use strict";
var RK = {};
(function(){
    function build(){
        const Methods = Object.freeze({"Euler":"euler", "Midpoint":"midpoint", "Classic4th":"classic4th", "Felhberg45":"felhberg45", "CashKarp":"cashkarp", "Fehlberg78":"fehlberg78"})
        
        /* @class Pointer, emulating a pointer, so that primative types can be passed by reference */
        class Pointer{
            /**
             * Creates an instance of Pointer
             *
             * @constructor
             * @author: Tripp Lamb
             * @param {generic} val the desired object to be wrapped.
             */
            constructor(val){
                this.val = val;
            }
        }
        
        
        
        /* @class ODE, represents a single ODE */
        class ODE{
            /**
             * Creates an instance of ODE
             *
             * @constructor
             * @author: Tripp Lamb
             * @param {number} epsilon The error epsilon to be used by the RK method.
             */
            constructor(epsilon){
                
                this.e = epsilon; //the error epsilon for this ODE
        
                this.name = ""; //an optional name for the ODE for bookkeeping and debugging
                this.x = {};    //integral of derivative
                this.dx = {};   //derivative of integral
                
                this.x0 = 0;    //the initial x value per pass
                this.dx0 = 0;   //the initial dx value per pass
                this.k = [];    //the rk step values
                this.f = 0;     //holds the rk (p+1)th order value
                this.fs = 0;    //holds the rk pth order value
        
                this.he = -1.0  //holds the current h value based on epsilon calculation, set from RK
        
            }
        
            /**
             * Connects the x and dx values to the corresponding values in entity.
             *
             * @param {number} x The integral of the ODE.
             * @param {number} dx The derivative of the ODE.
             * @param {string} name An optional name for the ODE.
             */
            connect(x, dx, name){
                
                this.x = x;
                this.dx = dx;
                
                if(typeof(name) !== "undefined"){
                    this.name = name;
                }
        
            }
        
            /**
             * Calculates delta0 over the interval h.
             *
             * @param {number} h The interval.
             * @return {number} The required delta based on epsilon.
             */
            calcDelta0(h){
                
                let d0;
        
                if(this.dx.val === 0.0) {d0 = this.e;}
                else { d0 = Math.abs(this.e * h * this.dx.val);}
        
                return d0;
            }
        
            /**
             * Calculates the appropriate dt request based on the current delta between the pth and (p+1)th order values
             *
             * @param {number} h1 The interval.
             * @param {number} sf The safety factor.
             * @return {number} The evaluated interval for the required epsilon.
             */
            calcInterval(h1, sf){
        
                let power = 0.0;
                let df0 = this.calcDelta0(h1);
                let df1 = Math.abs(this.f - this.fs);
        
                if(df1 <= 0.0) df1 = Number.MIN_VALUE;
        
                if(df0 >= df1) {power = 0.2;}
                else {power = 0.25;}
        
                let h0 = sf * h1 * Math.pow(Math.abs(df0 / df1), power);
                if (h0 === Number.POSITIVE_INFINITY) { h0 = Number.MAX_VALUE; }
                else if (h0 === Number.NEGATIVE_INFINITY) { h0 = -Number.MAX_VALUE; }
        
                return h0;
        
            }
        }
        
        /* @class GenRK, represents a system of ODEs to be solved via the Runge-Kutta method.*/
        class GenRK{
            /**
             * Creates an instance of RK
             *
             * @constructor
             * @author: Tripp Lamb
             * @param {integer} n The number of odes in the equation.
             * @param {Methods} method The RK method to be used, from the Methods enum.
             * @param {object} options The options for the rk method
             * @param {number} options.minDh The minimum interval to allow for embedded methods, the inteval for explicit methods
             * @param {number} options.maxDh The maximum interval to allow for embedded methods, ignored for explicit methods
             * @param {number} options.error The desired error threshold for embedded methods, overruled by minDh when in conflict, ignored for explicit methods
             * @param {number} options.safetyFactor the given safety factor for the ODE interval calculation for embedded methods, ignored for explicit methods
             */
            constructor(n, method, options){
        
                this.minDh = options.minDh;
                this.maxDh = options.maxDh;
                this.epsilon = options.error;
                this.sf = options.safetyFactor;
                this.wasReset = false;
        
                this.constantsInit(method);
                this.odes = [];
                for (let i = 0; i < n; i++) {
                    this.odes[i] = new ODE(this.epsilon);
                }
                this.dh = this.minDh;
                this.h = 0.0;
            }
        
            
            /**
             * Moves the entity forward in interval (most likely time) from `currentH` to `targetH`. 
             * It does not alter the interval in the ODESystem (or Entity) object, but it does return the new interval value, which is identical to `targetH`.
             *
             * @param {ODESystem} e The Entity object inheriting from RK.ODESystem.
             * @param {number} currentH The current interval value.
             * @param {number} targetH The target interval value.
             * @return {number} The new interval value. Identical to `targetH`.
             */
            motion(e, currentH, targetH){
                let hLeft = targetH - currentH;
                this.h = currentH;
                let dhReq = 0.0;
        
                if(!this.embedded) this.dh = this.minDh;
        
                if(hLeft <= 0.0) return currentH;
        
                do {
                    
                    dhReq = Math.min(this.dh, hLeft);
                    this.init(this.h, dhReq);
                    
                    for(let i = 1; i <= this.stepTotal; i++){
                        this.step(i);
                        e.updateODEs();
                        this.kUpdate(i);
                    }
        
                    this.calcOrderPS();
        
                    if(this.embedded){
                        hLeft = this.runAdaptiveTimeStepSizeLogic(e, hLeft);
                    }
                    else{
                        this.finish();
                        e.updateODEs();
                        hLeft -= this.dh;
                    }
        
                } while( hLeft > 1.e-15*this.dh)
        
                return targetH;
        
            }
        
            updateConfigParams(minDh, maxDh, error){
        
                this.minDh = minDh;
                this.maxDh = maxDh;
                this.epsilon = error;
        
                this.odes.forEach((ode) => {ode.e = this.epsilon;});
                this.dh = this.minDh;
        
            }
        
            init(h0, dh){
                this.h0 = h0;
                this.h = h0;
                this.dh = dh;
                this.stepNum = 1;
        
                for(let i = 0; i < this.odes.length; i++){
        
                    this.odes[i].x0 = this.odes[i].x.val;
                    this.odes[i].dx0 = this.odes[i].dx.val;
        
                }
        
            }
        
            step(stepNum){
                this.stepNum = stepNum;
                let s = this.stepNum - 1;
                this.h = this.h0 + this.c[s] * this.dh;
        
                for(let i = 0; i < this.odes.length; i++){
                    this.odes[i].x.val = 0.0;
                    for(let j = 0; j < s; j++){
                        this.odes[i].x.val += this.a[s][j] * this.odes[i].k[j];
                    }
                    this.odes[i].x.val = this.odes[i].x0 + this.dh * this.odes[i].x.val;
                }
        
            }
        
            kUpdate(step){
                let s = step - 1;
                for(let i = 0; i < this.odes.length; i++){
                    this.odes[i].k[s] = this.odes[i].dx.val;
                }
            }
        
            calcOrderPS(){
        
                for(let i = 0; i < this.odes.length; i++){
                    this.odes[i].fs = 0.0;
                    for(let j = 0; j < this.stepTotal; j++){
                        this.odes[i].fs += this.bs[j] * this.odes[i].k[j];
                    }
                    this.odes[i].fs = this.odes[i].x0 + this.dh * this.odes[i].fs;
                }
        
            }
        
            calcOrderP(){
        
                for(let i = 0; i < this.odes.length; i++){
                    this.odes[i].f = 0.0;
                    for(let j = 0; j < this.stepTotal; j++){
                        this.odes[i].f += this.b[j] * this.odes[i].k[j];
                    }
                    this.odes[i].f = this.odes[i].x0 + this.dh * this.odes[i].f;
                }
        
            }
        
            runAdaptiveTimeStepSizeLogic(e, hLeft){
        
                this.calcOrderP();
                let lastH = this.dh;
                this.dh = this.calcMinHerr();
        
                if(this.dh < lastH){
                    this.reset();
                    this.wasReset = true;
                    return hLeft;
                }
                else{
                    this.finish();
                    e.updateODEs();
                    this.wasReset = false;
                    return hLeft - lastH;
                }
        
            }
        
            calcMinHerr(){
                var he = [];
                for(let i = 0; i < this.odes.length; i++){
                    he[i] = this.odes[i].calcInterval(this.dh, this.sf);
                    this.odes[i].he = he[i];
                }
        
                let hCurrent = Math.min(...he);
        
                if(hCurrent > this.maxDh) {hCurrent = this.maxDh;}
                else if (hCurrent < this.minDh) { hCurrent = this.minDh; }
        
                return hCurrent;
            }
        
            finish(){
                for(let i = 0; i < this.odes.length; i++){
                    this.odes[i].x.val = this.odes[i].fs;
                }
            }
        
            reset(){
                this.h = this.h0;
                for(let i = 0; i < this.odes.length; i++){
                    this.odes[i].x.val = this.odes[i].x0;
                    this.odes[i].dx.val = this.odes[i].dx0;
                }
            }
        
            constantsInit(method) {
                this.a = [];
                this.b = [];
                this.bs = [];
                this.c = [];
                var name = "constantsInit_" + method;
                if (typeof (this[name]) !== "undefined") { this[name](); }
                else { throw new Error("Chosen rk method " + method + " is not supported") };
        
            }
        
            constantsInit_euler(){
                this.stepTotal = 1;
                this.embedded = false;
        
                this.a[0] = [];
        
                this.a[0][0] = 0.0;
                this.b[0] = 0.0;
                this.bs[0] = 1.0;
                this.c[0] = 0.0;
            }
        
            constantsInit_midpoint(){
                this.stepTotal = 1;
                this.embedded = false;
        
                for (let i = 0; i < this.stepTotal; i++) {
                    this.a[i] = [];
                    this.b[i] = 0.0;
                    this.bs[i] = 0.0;
                    this.c[i] = 0.0;
                    for (let j = 0; j < this.stepTotal; j++) {
                        this.a[i][j] = 0.0;
                    }
                }
        
                this.a[1][0] = 0.5;
                this.b[0] = 0.0;
        
                this.bs[0] = 0.0;
                this.bs[1] = 1.0;
        
                this.c[0] = 0.0;
                this.c[1] = 0.5;
            }
        
            constantsInit_classic4th(){
                this.stepTotal = 1;
                this.embedded = false;
        
                for (let i = 0; i < this.stepTotal; i++) {
                    this.a[i] = [];
                    this.b[i] = 0.0;
                    this.bs[i] = 0.0;
                    this.c[i] = 0.0;
                    for (let j = 0; j < this.stepTotal; j++) {
                        this.a[i][j] = 0.0;
                    }
                }
        
                this.a[1][0] = 0.5;
                this.a[2][1] = 0.5;
                this.a[3][2] = 1.0;
        
                this.b[0] = 0.0;
        
                this.bs[0] = 1.0/6.0;
                this.bs[1] = 1.0/3.0;
                this.bs[2] = 1.0/3.0;
                this.bs[3] = 1.0/6.0;
        
                this.c[0] = 0.0;
                this.c[1] = 0.5;
                this.c[2] = 0.5;
                this.c[3] = 1.0;
            }
        
            constantsInit_cashkarp() {
                this.stepTotal = 6;
                this.embedded = true;
        
        
                //initialize arrays
                for (let i = 0; i < this.stepTotal; i++) {
                    this.a[i] = [];
                    this.b[i] = 0.0;
                    this.bs[i] = 0.0;
                    this.c[i] = 0.0;
                    for (let j = 0; j < this.stepTotal; j++) {
                        this.a[i][j] = 0.0;
                    }
                }
        
                // k coefficients a[i,j]
                this.a[1][0] = 1.0 / 5.0;
                this.a[2][0] = 3.0 / 40.0;
                this.a[3][0] = 3.0 / 10.0;
                this.a[4][0] = -11.0 / 54.0;
                this.a[5][0] = 1631.0 / 55296.0;
        
                this.a[2][1] = 9.0 / 40.0;
                this.a[3][1] = -9.0 / 10.0;
                this.a[4][1] = 5.0 / 2.0;
                this.a[5][1] = 175.0 / 512.0;
        
                this.a[3][2] = 6.0 / 5.0;
                this.a[4][2] = -70.0 / 27.0;
                this.a[5][2] = 575.0 / 13824.0;
        
                this.a[4][3] = 35.0 / 27.0;
                this.a[5][3] = 44275.0 / 110592.0;
                this.a[5][4] = 253.0 / 4096.0;
        
                //initialize 5th order constants
                this.b[0] = 37.0 / 378.0;
                this.b[1] = 0.0;
                this.b[2] = 250.0 / 621.0;
                this.b[3] = 125.0 / 594.0;
                this.b[4] = 0.0;
                this.b[5] = 512.0 / 1771.0;
        
                //initialize 4th order constants
                this.bs[0] = 2825.0 / 27648.0;
                this.bs[1] = 0.0;
                this.bs[2] = 18575.0 / 48384.0;
                this.bs[3] = 13525.0 / 55296.0;
                this.bs[4] = 277.0 / 14336.0;
                this.bs[5] = 1.0 / 4.0;
        
                //initialize c coefficients
                this.c[0] = 0.0;
                this.c[1] = 1.0 / 5.0;
                this.c[2] = 3.0 / 10.0;
                this.c[3] = 3.0 / 5.0;
                this.c[4] = 1.0;
                this.c[5] = 7.0 / 8.0;
        
            }
        
            constantsInit_fehlberg45() {
                this.stepTotal = 6;
                this.embedded = true;
        
        
                //initialize arrays
                for (let i = 0; i < this.stepTotal; i++) {
                    this.a[i] = [];
                    this.b[i] = 0.0;
                    this.bs[i] = 0.0;
                    this.c[i] = 0.0;
                    for (let j = 0; j < this.stepTotal; j++) {
                        this.a[i][j] = 0.0;
                    }
                }
        
                // k coefficients a[i,j]
                this.a[1][0] = 1.0 / 4.0;
                this.a[2][0] = 3.0 / 32.0;
                this.a[3][0] = 1932.0 / 2197.0;
                this.a[4][0] = 439.0 / 216.0;
                this.a[5][0] = -8.0 / 27.0;
        
                this.a[2][1] = 9.0 / 32.0;
                this.a[3][1] = -7200.0 / 2197.0;
                this.a[4][1] = -8.0;
                this.a[5][1] = 2.0;
        
                this.a[3][2] = 7296.0 / 2197.0;
                this.a[4][2] = -3680.0 / 513.0;
                this.a[5][2] = -3544.0 / 2565.0;
        
                this.a[4][3] = -845.0 / 4104.0;
                this.a[5][3] = 1859.0 / 4104.0;
        
                this.a[5][4] = -11.0 / 40.0;
        
                //initialize 5th order constants
                this.b[0] = 16.0 / 135.0;
                this.b[1] = 0.0;
                this.b[2] = 6656.0 / 12825.0;
                this.b[3] = 28561.0 / 56430.0;
                this.b[4] = -9.0 / 50.0;
                this.b[5] = 2.0 / 55.0;
        
                //initialize 4th order constants
                this.bs[0] = 25.0 / 216.0;
                this.bs[1] = 0.0;
                this.bs[2] = 1408.0 / 2565.0;
                this.bs[3] = 2197.0 / 4104.0;
                this.bs[4] = -1.0 / 5.0;
                this.bs[5] = 0.0;
        
                //initialize c coefficients
                this.c[0] = 0.0;
                this.c[1] = 1.0 / 4.0;
                this.c[2] = 3.0 / 8.0;
                this.c[3] = 12.0 / 13.0;
                this.c[4] = 1.0;
                this.c[5] = 1.0 / 2.0;
        
            }
        
            constantsInit_fehlberg78() {
                this.stepTotal = 13;
                this.embedded = true;
        
        
                //initialize arrays
                for (let i = 0; i < this.stepTotal; i++) {
                    this.a[i] = [];
                    this.b[i] = 0.0;
                    this.bs[i] = 0.0;
                    this.c[i] = 0.0;
                    for (let j = 0; j < this.stepTotal; j++) {
                        this.a[i][j] = 0.0;
                    }
                }
        
                // k coefficients a[i,j]
                this.a[2][1]  =  2.0 / 27.0
                this.a[3][1]  =  1.0 / 36.0
                this.a[4][1]  =  1.0 / 24.0
                this.a[5][1]  =  5.0 / 12.0
                this.a[6][1]  =  1.0 / 20.0
                this.a[7][1]  = -25.0 / 108.0
                this.a[8][1]  =  31.0 / 300.0
                this.a[9][1]  =  2.0
                this.a[10][1] = -91.0 / 108.0
                this.a[11][1] =  2383.0 / 4100.0
                this.a[12][1] =  3.0 / 205.0
                this.a[13][1] = -1777.0 / 4100.0
                
                this.a[3][2] =  1.0 / 12.0
                
                this.a[4][3] =  1.0 / 8.0
                this.a[5][3] = -25.0 / 16.0
                
                this.a[5][4]  =  25.0 / 16.0
                this.a[6][4]  =  1.0 / 4.0
                this.a[7][4]  =  125.0 / 108.0
                this.a[8][4]  =  0.0
                this.a[9][4]  = -53.0 / 6.0
                this.a[10][4] =  23.0 / 108.0
                this.a[11][4] = -341.0 / 164.0
                this.a[12][4] =  0.0
                this.a[13][4] = -341.0 / 164.0
                
                this.a[6][5]  =  1.0 / 5.0
                this.a[7][5]  = -65.0 / 27.0
                this.a[8][5]  =  61.0 / 225.0
                this.a[9][5]  =  704.0 / 45.0
                this.a[10][5] = -976.0 / 135.0
                this.a[11][5] =  4496.0 / 1025.0
                this.a[12][5] =  0.0
                this.a[13][5] =  4496.0 / 1025.0
        
                this.a[7][6]  =  125.0 / 54.0
                this.a[8][6]  = -2.0 / 9.0
                this.a[9][6]  = -107.0 / 9.0
                this.a[10][6] =  311.0 / 54.0
                this.a[11][6] = -301.0 / 82.0
                this.a[12][6] = -6.0 / 41.0
                this.a[13][6] =  289.0 / 82.0
        
                this.a[8][7]  =  13.0 / 900.0
                this.a[9][7]  =  67.0 / 90.0
                this.a[10][7] = -19.0 / 60.0
                this.a[11][7] =  2133.0 / 4100.0
                this.a[12][7] = -3.0 / 205.0
                this.a[13][7] =  2193.0 / 4100.0
        
                this.a[9][8]  =  3.0
                this.a[10][8] =  17.0 / 6.0
                this.a[11][8] =  45.0 / 82.0
                this.a[12][8] = -3.0 / 41.0
                this.a[13][8] =  51.0 / 82.0
        
                this.a[10][9] = -1.0 / 12.0
                this.a[11][9] =  45.0 / 164.0
                this.a[12][9] =  3.0 / 41.0
                this.a[13][9] =  33.0 / 164.0
        
                this.a[11][10] =  18.0 / 41.0
                this.a[12][10] =  6.0 / 41.0
                this.a[13][10] =  12.0 / 41.0
        
                this.a[13][12] = 1.0
        
                //initialize eigth order constants
                this.b[1]  = 41.0 / 840.0
                this.b[2]  = 0.0
                this.b[3]  = 0.0
                this.b[4]  = 0.0
                this.b[5]  = 0.0
                this.b[6]  = 34.0 / 105.0
                this.b[7]  = 9.0 / 35.0
                this.b[8]  = 9.0 / 35.0
                this.b[9]  = 9.0 / 280.0
                this.b[10] = 9.0 / 280.0
                this.b[11] = 41.0 / 840.0
                this.b[12] = 0.0
                this.b[13] = 0.0
                
                //seventh order constants
                this.bs[1]  = 0.0
                this.bs[2]  = 0.0
                this.bs[3]  = 0.0
                this.bs[4]  = 0.0
                this.bs[5]  = 0.0
                this.bs[6]  = 34.0 / 105.0
                this.bs[7]  = 9.0 / 35.0
                this.bs[8]  = 9.0 / 35.0
                this.bs[9]  = 9.0 / 280.0
                this.bs[10] = 9.0 / 280.0
                this.bs[11] = 0.0
                this.bs[12] = 41.0 / 840.0
                this.bs[13] = 41.0 / 840.0
        
                //initialize c coefficients
                this.c[1]  = 0.0
                this.c[2]  = 2.0 / 27.0
                this.c[3]  = 1.0 / 9.0
                this.c[4]  = 1.0 / 6.0
                this.c[5]  = 5.0 / 12.0
                this.c[6]  = 1.0 / 2.0
                this.c[7]  = 5.0 / 6.0
                this.c[8]  = 1.0 / 6.0
                this.c[9]  = 2.0 / 3.0
                this.c[10] = 1.0 / 3.0
                this.c[11] = 1.0
                this.c[12] = 0.0
                this.c[13] = 1.0
        
            }
        
        }
        
        class ODESystem{
        
            constructor(){
            }
        
            odeSetup(odes){
                throw new Error("The `odeSetup()` method must be overridden by children classes");
            }
        
            updateODEs(){
                throw new Error("The `updateDerivs()` method must be overridden by children classes");
            }
        
        }
    
        let out = {
            Pointer: Pointer,
            Methods: Methods,
            ODE: ODE,
            ODESystem: ODESystem,
            RK: GenRK
        };
        return out;
        
    }
    
    if (typeof (module) !== "undefined") {
        module.exports = build();
    }
    else{
        RK = build();
    }

})();

