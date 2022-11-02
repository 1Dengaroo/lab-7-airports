const path1 = "airports.json";
const path2 = "world-110m.json";

async function fetchData(path) {
  const response = d3.json(path, d3.autotype);
  return response;
}

const airports = await fetchData(path1);
const worldmap = await fetchData(path2);

console.log(airports);
let visType = "force";

d3.selectAll("input[type=radio]").on("change", (event) => {
  visType = event.target.value;
  switchLayout();
});

const margin = { top: 15, right: 15, bottom: 15, left: 15 };
const width = 800 - margin.left - margin.right;
const height = 650 - margin.top - margin.bottom;
const d = 2000; // transition duration

// initialization
// SVG INIT ------------------
const svg = d3
  .select(".chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// convert topojson to geojson
const geojson = topojson.feature(worldmap, worldmap.objects.countries);

// create map
const projection = d3.geoMercator();

projection.fitExtent(
  [
    [0, 0],
    [width, height],
  ],
  geojson
);

const pathGenerator = d3.geoPath().projection(projection);

const map = svg
  .selectAll("path")
  .data(geojson.features)
  .join("path")
  .attr("d", pathGenerator);

// add white country borders
const boundaries = svg
  .append("path")
  .datum(topojson.mesh(worldmap, worldmap.objects.countries))
  .attr("d", pathGenerator)
  .attr("fill", "none")
  .attr("stroke", "white")
  .attr("class", "subunit-boundary");

// area scale for nodes based on passengers
const aScale = d3
  .scaleLinear()
  .domain(d3.extent(airports.nodes.map((d) => d.passengers)))
  .range([7, 13]);

// initialize force simulation
const force = d3
  .forceSimulation(airports.nodes)
  .force(
    "link",
    d3
      .forceLink()
      .id((d, i) => i)
      .distance(70)
  )
  .force("charge", d3.forceManyBody().strength(-100))
  .force("center", d3.forceCenter(width / 2, height / 2));

// create links
const links = svg
  .append("g")
  .attr("class", "links")
  .selectAll("line")
  .data(airports.links)
  .enter()
  .append("line")
  .attr("class", "link")
  .attr("stroke", "gray")
  .attr("stroke-width", 1);

// create nodes
const nodes = svg
  .append("g")
  .attr("class", "nodes")
  .selectAll("circle")
  .data(airports.nodes)
  .enter()
  .append("circle")
  .attr("class", "node")
  .attr("r", (d) => aScale(d.passengers))
  .attr("fill", "orange")
  .call(drag(force));

nodes.append("title").text((d) => d.name);

force.force("link").links(airports.links);

force.on("tick", handleTick);

// added logic to keep circles within svg limits
function handleTick() {
  links
    .attr("x1", (d) => {
      let xPos = d.source.x;
      if (xPos < 0) return 0;
      if (xPos > width - aScale(d.passengers)) {
        return width - aScale(d.passengers);
      }
      return xPos;
    })
    .attr("y1", (d) => {
      let yPos = d.source.y;
      if (yPos < 0) return 0;
      if (yPos > height - aScale(d.passengers)) {
        return height - aScale(d.passengers);
      }
      return yPos;
    })
    .attr("x2", (d) => {
      let xPos = d.target.x;
      if (xPos < 0) return 0;
      if (xPos > width - aScale(d.passengers)) {
        return width - aScale(d.passengers);
      }
      return xPos;
    })
    .attr("y2", (d) => {
      let yPos = d.target.y;
      if (yPos < 0) return 0;
      if (yPos > height - aScale(d.passengers)) {
        return height - aScale(d.passengers);
      }
      return yPos;
    });

  nodes
    .attr("cx", (d) => {
      let xPos = d.x;
      if (xPos < 0) return 0;
      if (xPos > width - aScale(d.passengers)) {
        return width - aScale(d.passengers);
      }
      return xPos;
    })
    .attr("cy", (d) => {
      let yPos = d.y;
      if (yPos < 0) return 0;
      if (yPos > height - aScale(d.passengers)) {
        return height - aScale(d.passengers);
      }

      return yPos;
    });
}

// drag function taken from the example that he linked us
function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// change layout based on radio input
function switchLayout() {
  if (visType === "map") {
    force.stop();
    force.nodes(airports.nodes).on("tick", null);
    svg.select("nodes").transition().duration(d);
    svg.select("links").transition().duration(d);
    nodes
      .transition()
      .duration(d)
      .attr("cx", (d) => {
        return projection([d.longitude, d.latitude])[0];
      })
      .attr("cy", (d) => {
        return projection([d.longitude, d.latitude])[1];
      });
    links
      .transition()
      .duration(d)
      .attr("x1", (d) => projection([d.source.longitude, d.source.latitude])[0])
      .attr("y1", (d) => projection([d.source.longitude, d.source.latitude])[1])
      .attr("x2", (d) => projection([d.target.longitude, d.target.latitude])[0])
      .attr(
        "y2",
        (d) => projection([d.target.longitude, d.target.latitude])[1]
      );
    svg.selectAll("path").style("opacity", 1);
  } else {
    force.nodes(airports.nodes).on("tick", handleTick);
    force.force("link").links(airports.links);
    force.restart();
    svg.selectAll("path").style("opacity", 0);
  }
}

// switch layout when it first loads so that both things aren't showing at once
switchLayout();
