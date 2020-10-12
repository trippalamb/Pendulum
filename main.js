var fps = 30;
var refresh = 1000 / fps;
var speed = 0.5;
var startTime;
var svg;
var e;
var truth;
var offset = {};
var r;
var td_error = 0.0;
var tde_trace = [];
var ape_trace = [];
var plotlyDiv;
var data;
var layout;

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

   
    plotlyDiv = document.getElementById('plotly-container');


    $(window).resize(resize);
    $("#method").width($("#min-dt").outerWidth())
                .height($("#min-dt").outerHeight());

    $("#btn-update").on("click", reconfigurePendulum);

    ape_trace = {
        x: [0.0],
        y: [0.0],
        type: 'scatter',
        name: "Absolute Position Error"
    };

    tde_trace = {
        x: [0.0],
        y: [0.0],
        type: 'scatter',
        name: "Total Distance Error"
    };

    data = [ape_trace, tde_trace];
    layout = {
        title: "Error Over Time",
        xaxis: {
            title: "Time (seconds)"
        },
        yaxis: {
            title: "Error (pixels)"
        }
    }

    resize();
    //TODO: make h2 of .form-container open and close form from view
    //TODO: hide or disable options in the configuration form for embedded versus explicit methods


}

function resize() {

    var w = $(window).width();
    var h = $(window).height() * 0.8;
    var size = Math.min(w, h);
    r = size / 4.0;

    offset.x = w / 2.0;
    offset.y = h / 4.0;

    //Create SVG element
    svg = d3.select("svg")
        .attr("width", w)
        .attr("height", offset.y + r + 30);


    $("#plotly-container div").width(w * 0.95);
    $("#plotly-container div").height(r * 2.0);
    Plotly.newPlot(plotlyDiv, data, layout);


    $("#configuration").offset({ top: 50, left: 50 });
    $("#data").offset({ top: 50, left: (w - 50 - $("#data").outerWidth()) });


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
    $("#pos").val(e.px.val.toFixed(2));
    $("#vel").val(e.vx.val.toFixed(2));
    $("#acc").val(e.ax.val.toFixed(2));
    $("#td-error").val(td_error.toExponential(5));
    $("#ap-error").val(ap_error.toExponential(5));

}

function updateChart() {
    var dt = (Date.now() - startTime) / 1000;
    var y0 = parseFloat($("#ap-error").val());
    var y1 = parseFloat($("#td-error").val());

    ape_trace.x.push(dt);
    ape_trace.y.push(y0);

    tde_trace.x.push(dt);
    tde_trace.y.push(y1);

    var width = $(window).width();
    if (ape_trace.x.length > width*5) {

        var save = ape_trace.x.length;
        var tde = [];
        var ape = [];

        for (var i = 0; i < ape_trace.x.length; i++) {
            ape.push({ x: ape_trace.x[i], y: ape_trace.y[i] });
            tde.push({ x: tde_trace.x[i], y: tde_trace.y[i] });
        }

        ape = largestTriangleThreeBucket(ape, width/2.0, "x", "y");
        tde = largestTriangleThreeBucket(tde, width/2.0, "x", "y");

        ape_trace.x = ape.map(a => a.x);
        ape_trace.y = ape.map(a => a.y);

        tde_trace.x = tde.map(a => a.x);
        tde_trace.y = tde.map(a => a.y);

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
