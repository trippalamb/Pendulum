var RK = RK || {};
try{
    RK = require("generic-rk");
} catch(error){
}

class Pendulum extends RK.ODESystem{
    constructor(t, px, vx, ax, options) {

        if (typeof (options) === "undefined") {
            options = {
                minDh: 1.0e-4,
                maxDh: 1.0,
                error: 1.0e-4,
                sf: 0.9,
                method: RK.Methods.CashKarp,
                color: "black"
            }
        }
        else {
            if (typeof (options.minDh) === "undefined") { options.minDh = 1.0e-4;}
            if (typeof (options.maxDh) === "undefined") { options.maxDh = 1.0;}
            if (typeof (options.error) === "undefined") { options.error = 1.0e-4;}
            if (typeof (options.sf) === "undefined") { options.sf = 0.9;}
            if (typeof (options.method) === "undefined") { options.method = RK.Methods.CashKarp;}
            if (typeof (options.color) === "undefined") { options.color = "black";}
        }



        super();

        this.t = t;
        this.px = new RK.Pointer(px);
        this.vx = new RK.Pointer(vx);
        this.ax = new RK.Pointer(ax);
        this.color = options.color;

        this.px0 = px;
        this.vx0 = vx;
        this.omega = Math.sqrt(2.0);
        this.rk = new RK.RK(2, options.method, {minDh: options.minDh, maxDh: options.maxDh, error:options.error, safetyFactor:options.sf});
        this.odeSetup();
    }

    timestep(targetTime) {

        this.t = this.rk.motion(this, this.t, targetTime);
    }

    setToTruth(targetTime) {
        var data = this.solution(targetTime);
        this.t = data[0];
        this.px.val = data[1];
        this.vx.val = data[2];
        this.ax.val = data[3];
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
        var tht = (this.px.val / r);
        var x = offset.x + r * Math.sin(tht);
        var y = offset.y + r * Math.cos(tht);
        return { x: x, y: y, tht:tht };
    }

    draw(svg, offset) {

        var pos = this.getCartesian();

        var data = [{ x: offset.x, y: offset.y }, { x: pos.x, y: pos.y }];
        var line = d3.line()
            .x((d) => d.x)
            .y((d) => d.y);

        svg.append("circle")
            .attr("class", "bob")
            .attr("cx", pos.x)
            .attr("cy", pos.y)
            .attr("r", 20)
            .attr("fill", this.color);

        svg.append("path")
            .attr("class", "rod")
            .attr("d", line(data))
            .attr("stroke", this.color)
            .attr("stroke-width", 3);
    }
}

if (typeof (module) !== "undefined") {
    module.exports = Pendulum;
}
