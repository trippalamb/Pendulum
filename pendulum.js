var RK = RK || {};
try{
    RK = require("generic-rk");
} catch(error){
}

class Pendulum extends RK.ODESystem{
    constructor(t, px, vx) {

        super();

        this.t = t;
        this.px = new RK.Pointer(px);
        this.vx = new RK.Pointer(vx);
        this.ax = new RK.Pointer(0.0);

        this.px0 = px;
        this.vx0 = vx;
        this.omega = Math.sqrt(2.0);
        this.rk = new RK.RK(2, RK.Methods.CashKarp, {minDh: 1.0e-4, maxDh: 1.0, error:1.0e-4, safetyFactor:0.90});
        this.odeSetup();
    }

    timestep(targetTime) {

        this.t = this.rk.motion(this, this.t, targetTime);
    }

    odeSetup(){

        this.rk.odes[0].connect(this.px, this.vx, "position");
        this.rk.odes[1].connect(this.vx, this.ax, "velocity");

    }

    updateODEs(){
        this.ax.val = -(Math.pow(this.omega, 2.0) * this.px.val);
    }

    solution(time){
        let phi = Math.atan2(-this.vx0, this.px0 * this.omega);
        let amplitude = this.px0/Math.cos(phi);

        let position = amplitude*Math.cos(this.omega*time + phi);
        let velocity = -this.omega*amplitude*Math.sin(this.omega*time + phi);
        let acceleration = -(this.omega*this.omega)*amplitude*Math.cos(this.omega*time + phi);

        return [time, position, velocity, acceleration];
    }

    getCartesian() {
        var tht = (e.px.val / r);
        var x = offset.x + r * Math.sin(tht);
        var y = offset.y + r * Math.cos(tht);
        return { x: x, y: y, tht:tht };
    }
}

if (typeof (module) !== "undefined") {
    module.exports = Pendulum;
}
