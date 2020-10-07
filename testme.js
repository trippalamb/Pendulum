const Pendulum = require("./pendulum.js");
function main() {

    var p0 = -200.0;
    var v0 = -67.0;
    var startTime = 0.0;
    var endTime = 10.0;

    var e = new Pendulum(startTime, p0, v0);
    e.timestep(endTime);

    var output = [e.t, e.px.val, e.vx.val, e.ax.val];
    var correct = e.solution(endTime);

    console.log(output);
    console.log(correct);
}

main();
