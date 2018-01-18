"use strict";

var OFFSET = 23;
var NORMAL_WIDTH = 6;
var SELECT_WIDTH = 8;
var NORMAL_OPACITY = 0.1;
var SELECT_OPACITY = 1;
var CHART_WIDTH = 500;
var CUTOFF = 11; // Update cutoff

var height = 390;
var padding = 40;
var middlePadding = (padding * 2) + 100;
var width = $(window).width() - middlePadding - CHART_WIDTH - 30;

var episodes = [1, 2, 3, 5, 6, 8, 10, 11];
var totalData;
var dFirst;

var colors = {
    "A": "#fb9fcb",
    "B": "#ff951c",
    "C": "#fff200",
    "D": "#00a500",
    "F": "gray"
};

// Set up plot
var svg = d3.select("#plot").append("svg")
    .attr("class", "axis")
    .attr("height", height + padding * 2)
    .attr("width", width + padding * 2);

var scaleX = d3.scaleLinear().domain([0, episodes.length - 1]).range([0, width]);
var scaleY = d3.scaleLinear().domain([0, 99]).range([0, height]);
var plot = svg.append("g").attr("transform", "translate(" + padding + "," + padding + ")");

setXAxis();

// Get data
d3.csv("produce101.csv", parseLine, function (err, data) {
    totalData = processData(data);
    plotData(data);
    selectLine(dFirst, "#line1");
    showChart("latestRank", true);
});

// Path generator
var pathGenerator = d3.line()
    .x(function (d) { return scaleX(d.x); })
    .y(function (d) { return scaleY(d.rank); });

// Set notes
for (var i = 0; i < episodes.length; i++) {
    $("#note" + i).css("left", scaleX(i) + OFFSET + 40).hide();
}

resetLines();


function setXAxis() {
    episodes.forEach(function (episode, i) {
        // Add episode label
        plot.append("text")
            .text("Ep " + episode)
            .attr("x", scaleX(i))
            .attr("y", -20)
            .attr("class", "episodeLabel smallCaps");

        // Add gridline
        plot.append("path")
            .attr("d", "M" + scaleX(i) + "," + scaleY(0) + "L" + scaleX(i) + "," + scaleY(99))
            .style("opacity", "0.1")
            .style("stroke-width", 3);
    });
}

// Add rank info to data
function processData(data) {
    data.forEach(function(d) {
        d.latestRank = getLatestRank(d);
        d.currentRank = getCurrentRank(d);
        d.isEliminated = isEliminated(d);
        d.rankChange = getRankChange(d);
    })
    return data;
}

function isEliminated(d) {
    return (d.ranking == undefined || d.latestRank > CUTOFF);
}

// Sorts an array of objects by key
function sortByKey(array, key, asc) {
    return array.sort(function(a, b) {
        var x = a[key];
        var y = b[key];
        if (asc) {
            if (x == "-") {
                return 1;
            }
            if (y == "-") {
                return -1;
            }
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }
        if (y == "-") {
            return -1;
        }
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    });
}

// Sort chart by key
function toggleSort(key) {
    var sortAsc = $("#" + key).data("asc");
    // Select this key if needed
    if (!$("#" + key).hasClass("selectedSort")) {
        $("#top th").removeClass("selectedSort");
        $("#" + key).addClass("selectedSort");
    }
    $("#" + key).data("asc", !sortAsc); // Toggle sort
    showChart(key, !sortAsc);
}

// Update chart
function showChart(key, asc) {
    var sortedData = sortByKey(totalData, key, asc);
    console.log(sortedData);
    var top = d3.select("#topBody");

    top.selectAll("tr.top").remove();
    var topDivs = top.selectAll("tr.top").data(sortedData);

    topDivs.enter().append("tr")
        .attr("class", function(d) {
            if (d.isEliminated) {
                return "top";
            } else {
                return "top wanna-members";
            }
        })
        .html(function(d) {
            var letter = '<div class="letter" style="background: ' + getBackground(d) + '; color: ' + getTextColor(d) + '">' + d.letter + '</div>';
            var rank = d.latestRank;
            if (rank == 1000) {
                rank = "-";
            }
            return td(rank, "smWidth") + td(d.name, "nameWidth") + td(d.company, "companyWidth") + td(letter, "smWidth") + td(displayRankChange(d), "rankWidth");
        })
        .on("mouseover", function(d) {
            selectLine(d, "#line" + d.latestRank);
        });
 }

 function td(str, cl) {
     return "<td class='" + cl + "'>" + str + "</td>";
 }



// Displays profile
function displayProfile(d) {
    $("#pic").attr("src", getImageSource(d));
    $("#infoName").text(d.name);
    $("#infoLetter")
        .text(d.letter)
        .css("background", getBackground(d))
        .css("color", getTextColor(d));
    $("#infoCompany").text(d.company);
    $("#infoRank").html(getRankInfo(d));
}

function getImageSource(d) {
    return "pics/" + d.name.replace(/ /g, "") + ".jpg";
}

function getBackground(d) {
    return colors[d.letter];
}

function resetLines() {
    plot.selectAll("path.ranking")
        .style("opacity", NORMAL_OPACITY)
        .style("stroke-width", NORMAL_WIDTH);
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// Select line indicated by lineId
function selectLine(d, lineId) {
    // Hide other lines
    plot.selectAll("path.ranking").style("opacity", NORMAL_OPACITY);

    // Move line to front and select
    var line = d3.select(lineId);
    line.moveToFront();
    line.style("opacity", SELECT_OPACITY).style("stroke-width", SELECT_WIDTH);

    // Show notes
    updateNotes(d);

    // Update box
    displayProfile(d);
    $("#profile").show();
    // $("#profile").css("top", getInfoTop(d));
}


function getLowestRank(data) {
    var min = 100;
    data.forEach(function(d) {
        d.ranking.forEach(function(d2) {
            if (d2 < min) {
                min = d2;
            }
        })
    })
    return min;
}

function plotData(data) {

    // Update y axis
    scaleY.domain([1, getLowestRank(data)]);

    var paths = plot.selectAll("path.ranking").data(data);



    var pathGenerator = d3.line()
    .x(function (d) { return scaleX(d.x); })
    .y(function (d) { return scaleY(d.rank); });

    paths.enter().append("path")
        .attr("class", "ranking")
        .attr("id", function(d) {
            if (d.latestRank == 1) {
                dFirst = d;
            }
            if (d.specialNote != "") { // Special Line
                return "sline" + d.latestRank;
            }
            return "line" + d.latestRank;
        })
        .attr("d", function(d, i) {
            return pathGenerator(d.ranking);
        })
        .style("stroke", function(d, i) {
            return getBackground(d);
        })
        .style("stroke-width", NORMAL_WIDTH)
        .on("mouseover", function (d) {
            selectLine(d, this);
        })
        .on("mouseout", function(d) {
            resetLines();

            // Hide notes and box
            $(".note").hide();
            $("#profile").hide();
        });

    paths.exit().remove();
}

// Returns the latest rank for every contestant, 1000 for those never ranked
function getLatestRank(d) {
    var ranking = d.ranking[d.ranking.length - 1];
    if (ranking == undefined) {
        return 1000;
    }
    return ranking.rank;
}

// Returns the rank for current contestants, and -1 for all those eliminated
function getCurrentRank(d) {
    if (d.ranking.length < episodes.length) {
        return -1;
    }
    return getLatestRank(d);
}

// Returns the change in rank, or "-" for eliminated contestants
function getRankChange(d) {
    if (d.ranking.length < episodes.length) {
        return "-";
    }
    var prevRank = d.ranking[d.ranking.length - 2].rank;
    return prevRank - getCurrentRank(d);
}

// Returns rank with image according to [change], which must be a number
function displayRankChange(d) {
    if (d.rankChange == "-") {
        return "-";
    } else if (d.rankChange > 0) {
        return "<img src='img/up-arrow.png' class='arrow'><span class='change up'>" + d.rankChange + '<span>';
    } else if (d.rankChange < 0) {
        return "<img src='img/down-arrow.png' class='arrow'><span class='change down'>" + Math.abs(d.rankChange) + '<span>';
    } else {
        return "<img src='img/neutral-arrow.png' class='arrow'><span class='change'>0</span>";
    }
}

// Returns the change for current contestants, or shows elimination
function getRankInfo(d) {
    if (d.specialNote != "") {
        return d.specialNote;
    }
    if (d.ranking.length == 0) {
        return "Withdrew from show";
    }
    if (d.isEliminated) {
        return "Eliminated in Episode " + episodes[d.ranking.length - 1];
    }
    return "Wanna One Member, Rank " + d.currentRank + " " + displayRankChange(d);
}

function updateNotes(d) {
    $(".note").show();
    for (var i = 0; i < episodes.length; i++) {
        // No ranking, contestant dropped at this point -- hide note
        if (d.ranking[i] == undefined) {
            $("#note" + i).hide();
        } else { // Show rank
            var rank = d.ranking[i].rank;
            $("#note" + i)
                .text(rank)
                .css("top", scaleY(rank) + OFFSET)
                .css("background", getBackground(d))
                .css("color", getTextColor(d));
        }
    }
}

// Get color of note text (all white except for yellow rank C)
function getTextColor(d) {
    if (d.letter == "C") {
        return "black";
    }
    return "white";
}

// Return rank or -1 if no rank (eliminated)
function getRank(n) {
    if (n == "-") {
        return -1;
    }
    return Number(n);
}

// Parse line of csv to return a new row with episode, x, rank, and rankings[]
function parseLine(row) {
    var r = {};
    r.name = row.Name;
    r.company = row.Company;
    r.letter = row["Re-Evaluation"];
    r.specialNote = row.note;
    r.ranking = [];
    episodes.forEach(function(episode, i) {
        var rank = getRank(row["ep" + episode]);
        if (rank > 0) {
            var o = {};
            o.episode = episode;
            o.x = i;
            o.rank = rank;
            r.ranking.push(o);
        }
    })
    return r;
}

function translate(x, y) {
    return "translate(" + x + "," + y + ")";
}
