function main() {

    var p0 = -71975.2875240052;
    var v0 = -28118.9977611020;
    var startTime = 0.0;
    var endTime = 20.0;

    var e = new Pendulum(startTime, p0, v0);
    e.timestep(endTime);

    var output = [e.t, e.px.val, e.vx.val, e.ax.val];
    var correct = e.solution(endTime);

    console.log(output);
    console.log(correct);
}