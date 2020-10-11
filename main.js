//const Pendulum = require("./pendulum.js");
var fps = 60;
var refresh = 1000 / fps;
var speed = 0.5;
var startTime;
var svg;
var e;
var truth
var offset = {};
var r;
var e_td = 0;
var truth_td = 0;
var td_error = 0.0;
var tde_trace = [];
var ape_trace = [];
var plotlyDiv;
var data;

function main() {

    init();
    
    var p0 = -1.5 * r;

    startTime = Date.now();
    e = new Pendulum(0.0, p0, 0.0, 0.0);
    truth = new Pendulum(0.0, p0, 0.0, 0.0, { color: "blue" });
    
    setInterval(draw, refresh);
    setInterval(updateChart, refresh);
}

function init() {

    var width = $(window).width();
    var height = $(window).height() * 0.8;
    //Create SVG element
    svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    resize();

    $(window).resize(resize);

    $("#btn-update").on("click", reconfigurePendulum);

    tde_trace = {
        x: [0.0],
        y: [0.0],
        type: 'scatter'
    };

    ape_trace = {
        x: [0.0],
        y: [0.0],
        type: 'scatter'
    };

    data = [tde_trace, ape_trace];

    plotlyDiv = document.getElementById('plotly-container');
    Plotly.newPlot(plotlyDiv, data);

}

function resize() {
    var w = $(window).width();
    var h = $(window).height() * 0.8;
    var size = Math.min(w, h)
    r = size / 3.0;
    offset.x = size / 2.0;
    offset.y = size / 4.0;


}

function reconfigurePendulum() {
    var options = {
        minDh: parseFloat($("#min-dt").val()),
        maxDh: parseFloat($("#max-dt").val()),
        error: parseFloat($("#epsilon").val()),
        sf: parseFloat($("#sf").val()),
        method: $("#method").find(":selected").val(),
    };

    startTime = Date.now();
    tde_trace.x = [0.0];
    tde_trace.y = [0.0];
    ape_trace.x = [0.0];
    ape_trace.y = [0.0];
    td_error = 0.0;
    ap_error = 0.0;

    e = new Pendulum(0.0, truth.px.val, truth.vx.val, truth.ax.val, options);
    truth = new Pendulum(0.0, truth.px.val, truth.vx.val, truth.ax.val, { color: truth.color });

    Plotly.newPlot(plotlyDiv, data);
    return false;
}

function draw() {

    var dt = Date.now() - startTime;
    var time = speed * (dt / 1000.0);
    var e_prevPos = e.px.val;
    var truth_prevPos = truth.px.val;

    e.timestep(time);
    truth.setToTruth(time);

    var e_dp = Math.abs(e_prevPos - e.px.val);
    var truth_dp = Math.abs(truth_prevPos - truth.px.val);
    td_error += Math.abs(e_dp - truth_dp);
    var ap_error = e.px.val - truth.px.val;

    //draw svg
    svg.selectAll("*").remove();

    truth.draw(svg, offset);
    e.draw(svg, offset);


    //update data
    $("#pos").val(e.px.val);
    $("#vel").val(e.vx.val);
    $("#acc").val(e.ax.val);
    $("#td-error").val(td_error);
    $("#ap-error").val(ap_error);

}

function updateChart() {
    var dt = (Date.now() - startTime) / 1000;
    var y0 = parseFloat($("#td-error").val());
    var y1 = parseFloat($("#ap-error").val());

    tde_trace.x.push(dt);
    tde_trace.y.push(y0);

    ape_trace.x.push(dt);
    ape_trace.y.push(y1);

    var width = $(window).width();
    if (tde_trace.x.length > width*5) {

        var save = tde_trace.x.length;
        var tde = [];
        var ape = [];

        for (var i = 0; i < tde_trace.x.length; i++) {
            tde.push({ x: tde_trace.x[i], y: tde_trace.y[i] });
            ape.push({ x: ape_trace.x[i], y: ape_trace.y[i] });
        }

        tde = largestTriangleThreeBucket(tde, width/2.0, "x", "y");
        ape = largestTriangleThreeBucket(ape, width/2.0, "x", "y");

        tde_trace.x = tde.map(a => a.x);
        tde_trace.y = tde.map(a => a.y);

        ape_trace.x = ape.map(a => a.x);
        ape_trace.y = ape.map(a => a.y);

        if (save !== tde_trace.x.length) {
            console.log("here");
        }
        Plotly.newPlot(plotlyDiv, data);
    }
    else {
        Plotly.extendTraces(plotlyDiv, {
            x: [[dt], [dt]],
            y: [[y0], [y1]]
        }, [0, 1]);
    }


}


// implementation of the "Largest Triangle Three Bucket" algorithm by Sveinn Steinarsson
function largestTriangleThreeBucket(data, threshold, xProperty, yProperty) {
    yProperty = yProperty || 0;
    xProperty = xProperty || 1;

    var m = Math.floor;
    var y = Math.abs;
    var f = data.length;

    if (threshold >= f || 0 === threshold) {
        return data
    }

    var n = [];
    var t = 0;
    var p = (f - 2) / (threshold - 2);
    var c = 0;
    var v, u, w;

    n[t++] = data[c];

    for (var e = 0; e < threshold - 2; e++) {
        for (var g = 0,
            h = 0,
            a = m((e + 1) * p) + 1,
            d = m((e + 2) * p) + 1,
            d = d < f ? d : f,
            k = d - a; a < d; a++) {
            g += +data[a][xProperty], h += +data[a][yProperty];
        }
        for (var g = g / k,
            h = h / k,
            a = m((e + 0) * p) + 1,
            d = m((e + 1) * p) + 1,
            k = +data[c][xProperty],
            x = +data[c][yProperty],
            c = -1; a < d; a++) {
            "undefined" != typeof data[a] &&
                (u = 0.5 * y((k - g) * (data[a][yProperty] - x) - (k - data[a][xProperty]) * (h - x)),
                    u > c && (c = u, v = data[a], w = a));
        }

        n[t++] = v;
        c = w;
    }

    n[t++] = data[f - 1];

    return n;
}
