// script.js

let globalGraphData = {}


// When the page loads, add an event listener to the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generateGraph').addEventListener('click', async () => {
        const objectName = document.getElementById('objectInput').value;
        if (objectName) {
            globalGraphData = {}
            await buildGraph('_' + objectName);
        }
    });
});


// Make the gpt response lowercase and prepend '_' to items
function parseGptResponse(content) {
    const data = JSON.parse(content);
    const dataLower = {
      instruction: data.instruction.toLowerCase(),
      things_required: data.things_required.map(v => '_' + v.toLowerCase())
    };
    return dataLower;
}


// Format the data from gpt to be used by vis.js
function formatData(obj, data) {
    const outParsed = parseGptResponse(data);
  
    if (!globalGraphData[`_${obj}`]) {
      globalGraphData[`_${obj}`] = [];
    }
    globalGraphData[`_${obj}`].push(outParsed.instruction);
  
    if (!globalGraphData[outParsed.instruction]) {
      globalGraphData[outParsed.instruction] = [];
    }
    globalGraphData[outParsed.instruction] = outParsed.things_required;
  
    return globalGraphData;
}


// Make the graph labels look nice
function wrapLabel(label, maxWidth) {
    let lines = [];
    let words = label.split(' ');
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        let word = words[i];
        if (currentLine.length + word.length >= maxWidth) {
        lines.push(currentLine);
        currentLine = word;
        } else {
        currentLine += ' ' + word;
        }
    }
    lines.push(currentLine);

    return lines.join('\n');
}


// Use gpt to expand the graph
async function expandAndUpdateGraph(nodeId, nodes, edges) {

    document.getElementById('loading').style.display = 'inline-block';

    let obj = nodeId.slice(1); // Remove the leading underscore

    // check if node has already been expanded TODO: delete and redo expansion
    if (globalGraphData[nodeId]) {
        updateGraph(nodes, edges, globalGraphData);
        document.getElementById('loading').style.display = 'none';
        return globalGraphData;
    }

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obj: obj})
    };

    console.log(nodeId);

    const response = await fetch('/expand', requestOptions);
    if (!response.ok) {
        console.error('Error querying GPT.', response);
        return;
    }
    const gptResponse = await response.json();
    console.log(gptResponse);
    const updatedGraphData = formatData(obj, gptResponse);

    updateGraph(nodes, edges, updatedGraphData);

    document.getElementById('loading').style.display = 'none';

    return updatedGraphData;
}


// Depending on whether it's an instruction node or an item node
// change the style
function getNodeOptions(label) {
    let niceLabel = wrapLabel(label, 15);
    let options = { id: label, label: niceLabel, 
                    chosen: false, 
                    color: {background: '#FFFFFF', border: '#000000' }, 
                    font: 16
                };

    // if first character is '_' then remove it
    if (niceLabel[0] === '_') {
        niceLabel = niceLabel.substring(1);
        options.label = niceLabel
        options.color = {background: '#FFFFDD', border: '#000000' }
    } else {
        options.shape = 'box';
        options.color = {background: '#DDDDFF', border: '#000000' }
    }
    return options;
}


// Update the graph with new nodes and edges
async function updateGraph(nodes, edges, updatedGraphData) {
    // Check and add new nodes
    Object.keys(updatedGraphData).forEach((key) => {
        if (!nodes.get(key)) {
            nodes.add(getNodeOptions(key));
        }
        updatedGraphData[key].forEach((target) => {
        if (!nodes.get(target)) {
            nodes.add(getNodeOptions(target));
        }
        if (!edges.get({
            filter: function (item) {
            return (item.from === key && item.to === target);
            }
        }).length) {
            edges.add({ from: key, to: target, chosen: false, arrows: 'from' });
        }
        });
    });
}
  

// Initial graph build
async function buildGraph(rootNode) {    
    let nodes = [];
    let edges = [];

    let container = document.getElementById('mynetwork');
    let GraphData = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    const data = await expandAndUpdateGraph(rootNode, GraphData.nodes, GraphData.edges);

    // Manually set colour of root node
    GraphData.nodes.update({ id: rootNode, color: {background: '#FFDDDD', border: '#000000' }});

    let options = {};
    let network = new vis.Network(container, GraphData, options);

    network.on("click", function (params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];

            console.log(nodeId);
            if (nodeId[0] === '_' && nodeId !== rootNode) {
                expandAndUpdateGraph(nodeId, GraphData.nodes, GraphData.edges);
            }
        }
    });

    return globalGraphData
}

