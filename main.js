//const Pendulum = require("./pendulum.js");
var fps = 60;
var refresh = 1000 / fps;
var speed = 0.5;
var startTime;
var svg;
var e;
var offset = {};
var r;

function main() {

    init();
    
    var p0 = -1.5 * r;

    e = new Pendulum(speed * (Date.now() / 1000.0), p0, 0.0);
    
    setInterval(draw, refresh);
}

function init() {

    var width = $(window).width();
    var height = $(window).height() * 0.8;
    //Create SVG element
    svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    resize();

    $(window).resize(resize)
}

function resize() {
    var w = $(window).width();
    var h = $(window).height() * 0.8;
    var size = Math.min(w, h)
    r = size / 3.0;
    offset.x = size / 2.0;
    offset.y = size / 4.0;


}

function draw() {

    var time = speed * (Date.now() / 1000.0);
    e.timestep(time);
    
    var pos = e.getCartesian();

    var data = [{ x: offset.x, y: offset.y }, { x: pos.x, y: pos.y }];
    var line = d3.line()
        .x((d) => d.x )
        .y((d) => d.y);


    svg.selectAll("circle.bob").remove();
    svg.selectAll("path.rod").remove();

    svg.append("circle")
        .attr("class", "bob")
        .attr("cx", pos.x)
        .attr("cy", pos.y)
        .attr("r", 20);

    svg.append("path")
        .attr("class", "rod")
        .attr("d", line(data))
        .attr("stroke", "black")
        .attr("stroke-width", 3);
}
