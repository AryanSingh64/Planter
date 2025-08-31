window.addEventListener('DOMContentLoaded', function() {
  const loadBtn = document.querySelector('[onclick="loadMindMap()"]'); // or use id
  loadBtn.dataset.originalHtml = loadBtn.innerHTML;
});


// Initialize cytoscape
const cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [],//starts with no nodes
    style: [//styling for nodes and edges
        {
            selector: 'node',
            style: {
        'background-color': 'skyblue',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#000',
        'font-size': '11px',
        'font-weight': 'normal',
        //for text wrapping
        'text-wrap': 'wrap',
        'text-max-width': '130px', 
        'text-overflow-wrap': 'anywhere',
        // FIXED: Slightly larger nodes to accommodate text
        'width': 140,
        'height': 'auto',                    
        // Auto height based on content
        'min-width': '140px',
        'min-height': '80px',
        'max-height': '120px',               
        // Prevent nodes from getting too tall
        'shape': 'round-rectangle',
        'border-width': 1,
        'border-color': '#333',
        // ADDED: Padding for better text spacing
        'padding': '13px'
    }
        },
        {
            selector: 'node.selected',
            style: {
                'background-color': '#ff6b6b',
                'border-color': '#ff0000',
                'border-width': 3
            }
        },
        {
            selector: 'node.drag-source',
            style: {
                'background-color': '#4ecdc4',
                'border-color': '#26a69a',
                'border-width': 3
            }
        },
        {
            selector: 'node.drag-target',
            style: {
                'background-color': '#ffeb3b',
                'border-color': '#fbc02d',
                'border-width': 3
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 3,
                'line-color': '#666',
                'target-arrow-color': '#666',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier'
            }
        },
        {
            selector: 'edge:hover',
            style: {
                'line-color': '#ff6b6b',
                'target-arrow-color': '#ff6b6b',
                'width': 4,
                'opacity': 0.8
            }
        },
        {
            selector: 'edge.deletable',
            style: {
                'line-color': '#ff0000',
                'target-arrow-color': '#ff0000',
                'width': 5,
                'line-style': 'dashed',
                'opacity': 0.9
            }
        }
    ],
    layout: {
        name: 'preset',
    }
});

//done

// Variables
let doubleClickMode = false;
let doubleClickSource = null;
let selectedNode = null;
let connectionMode = false;
let isDragging = false;  // FIXED: Keep as simple boolean
let dragSource = null;
let tempEdge = null;
let deleteMode = false;

// helper function for removing temporary edges
function cleanupDrag() {
    // console.log('Cleaning up drag state');
    
    if (tempEdge) {
        tempEdge.remove();
        tempEdge = null;
    }
    
    // Remove mouse target
    const mouseTarget = cy.getElementById('mouse-target');
    if (mouseTarget.length > 0) {
        mouseTarget.remove();
    }
    
    // Remove all drag classes
    cy.nodes('.drag-source, .drag-target').removeClass('drag-source drag-target');
    
    // Reset state
    isDragging = false;
    dragSource = null;
    
    console.log('Drag cleanup complete');
}

// Click-to-connect mode by button
cy.on('tap', 'node', function(evt) { //listens to clicks
    if (!connectionMode) return;//only work if connection node is active
    
    const node = evt.target;//getting the clicked node
    
    if (!selectedNode) {
        selectedNode = node;
        node.addClass('selected');//it turns the selected node red
    } else if (selectedNode.id() !== node.id()) {
        const edgeId = selectedNode.id() + '-' + node.id();//create unique edge id

        if (cy.getElementById(edgeId).length === 0) {//chk if edge already exists
            cy.add({//create new edge
                group: 'edges',
                data: {
                    id: edgeId,
                    source: selectedNode.id(),
                    target: node.id()
                }
            });
        }
        // Reset selection - cleanup
        selectedNode.removeClass('selected');
        selectedNode = null;
        connectionMode = false;
        
        document.getElementById('connectBtn').innerHTML = '<i class="fa-solid fa-link"></i><br> <span>Connect Topics</span>';
        document.getElementById('connectBtn').style.backgroundColor = '';
    }
});

// Edge click handler for deletion
cy.on('tap', 'edge', function(evt) {
    if (!deleteMode) return;
    
    const edge = evt.target;
    const sourceLabel = edge.source().data('label');
    const targetLabel = edge.target().data('label');
    
    
    if (confirm(`Delete connection between "${sourceLabel}" and "${targetLabel}"?`)) {
        edge.remove();
        // console.log(`Connection deleted: ${sourceLabel} → ${targetLabel}`);

        // Turn off delete mode after deletion - cleanup
        deleteMode = false;
        const btn = document.getElementById('deleteBtn');
        btn.textContent = 'ⅹ';
        btn.style.backgroundColor = '#ff6b6b';
        cy.edges().removeClass('deletable');
    }
});


//completed -- here -- completed

// Double-click connection
cy.on('dbltap', 'node', function(evt) {
    if (connectionMode) return;
    
    const node = evt.target;
    
    if (!doubleClickMode) {
        doubleClickMode = true;
        doubleClickSource = node;
        node.addClass('drag-source');
        
        node.style({
            'border-color': '#ff6b6b',
            'border-width': '4px'
        });
        
        console.log('Double-click mode started. Double-click another node to connect.');
        
    } else if (doubleClickSource && doubleClickSource.id() !== node.id()) {
        const edgeId = doubleClickSource.id() + '-' + node.id();
        
        if (cy.getElementById(edgeId).length === 0) {
            cy.add({
                group: 'edges',
                data: {
                    id: edgeId,
                    source: doubleClickSource.id(),
                    target: node.id()
                }
            });
            console.log('Connection created!');
        }
        
        doubleClickSource.removeClass('drag-source');
        doubleClickSource.removeStyle('border-color border-width');
        doubleClickMode = false;
        doubleClickSource = null;
        
    } else if (doubleClickSource && doubleClickSource.id() === node.id()) {
        doubleClickSource.removeClass('drag-source');
        doubleClickSource.removeStyle('border-color border-width');
        doubleClickMode = false;
        doubleClickSource = null;
        console.log('Double-click mode cancelled.');
    }
});

// CORRECTED: Simple Ctrl+Drag connection method
cy.on('mousedown', 'node', function(evt) {
    if (evt.originalEvent.ctrlKey || evt.originalEvent.metaKey) {
        if (connectionMode || doubleClickMode || deleteMode) return;
        
        evt.originalEvent.preventDefault();
        evt.originalEvent.stopPropagation();
        
        isDragging = true;  // Simple boolean
        dragSource = evt.target;
        dragSource.addClass('drag-source');

        tempEdge = cy.add({
            group: 'edges',
            data: {
                id: 'temp-edge',
                source: dragSource.id(),
                target: dragSource.id()
            },
            style: {
                'line-color': '#ff6b6b',
                'line-style': 'dashed',
                'target-arrow-color': '#ff6b6b',
                'opacity': 0.7
            }
        });
        
        console.log('Ctrl+drag started from:', dragSource.data('label'));
        evt.stopPropagation();
    }
});

// CORRECTED: Simple mousemove handler
cy.on('mousemove', function(evt) {
    if (isDragging && tempEdge) {
        const pos = evt.position || evt.cyPosition;
        
        // Find target nodes
        let targetNode = null;
        const nodes = cy.nodes();
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.id() === dragSource.id()) continue;
            
            const nodePos = node.position();
            const distance = Math.sqrt(
                Math.pow(pos.x - nodePos.x, 2) + Math.pow(pos.y - nodePos.y, 2)
            );
            
            if (distance < 30) {
                targetNode = node;
                break;
            }
        }
        
        // Clear previous highlights
        cy.nodes('.drag-target').removeClass('drag-target');
        
        if (targetNode) {
            targetNode.addClass('drag-target');
            tempEdge.move({ target: targetNode.id() });
        } else {
            // Create/update invisible mouse target
            const mouseTargetId = 'mouse-target';
            let mouseTarget = cy.getElementById(mouseTargetId);
            
            if (mouseTarget.length === 0) {
                mouseTarget = cy.add({
                    group: 'nodes',
                    data: { id: mouseTargetId },
                    position: pos,
                    style: { 'opacity': 0, 'width': 1, 'height': 1 }
                });
            } else {
                mouseTarget.position(pos);
            }
            
            tempEdge.move({ target: mouseTargetId });
        }
    }
});

// CORRECTED: Document-level mouseup handler
document.addEventListener('mouseup', function(evt) {
    if (isDragging) {
        console.log('Mouse up detected during drag');
        
        // Get mouse position relative to cytoscape container
        const cyContainer = document.getElementById('cy');
        const rect = cyContainer.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        
        // Find target node at mouse position
        let targetNode = null;
        const nodes = cy.nodes();
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.id() === dragSource.id() || node.id() === 'mouse-target') continue;
            
            const nodePos = node.renderedPosition();
            const distance = Math.sqrt(
                Math.pow(x - nodePos.x, 2) + Math.pow(y - nodePos.y, 2)
            );
            
            if (distance < 40) {
                targetNode = node;
                break;
            }
        }
        
        if (targetNode) {
            const edgeId = dragSource.id() + '-' + targetNode.id();
            
            if (cy.getElementById(edgeId).length === 0) {
                cy.add({
                    group: 'edges',
                    data: {
                        id: edgeId,
                        source: dragSource.id(),
                        target: targetNode.id()
                    }
                });
                console.log('Connection created:', dragSource.data('label'), '→', targetNode.data('label'));
            }
        } else {
            console.log('No target found - connection cancelled');
        }

        // Always cleanup
        cleanupDrag();
    }
});

// CORRECTED: ESC key handler
document.addEventListener('keydown', function(evt) {
    if (evt.key === 'Escape') {
        console.log('ESC pressed');
        
        // Cancel double-click mode
        if (doubleClickMode && doubleClickSource) {
            doubleClickSource.removeClass('drag-source');
            doubleClickSource.removeStyle('border-color border-width');
            doubleClickMode = false;
            doubleClickSource = null;
            console.log('Double-click mode cancelled with ESC.');
        }
        
        // Cancel drag mode
        if (isDragging) {
            cleanupDrag();
            console.log('Ctrl+drag mode cancelled with ESC.');
        }
        
        // Cancel delete mode
        if (deleteMode) {
            toggleDeleteMode();
        }
        
        // Cancel connection mode
        if (connectionMode) {
            toggleConnectionMode();
        }
    }
});

// Enter key to add node (not on Shift+Enter)
document.getElementById('topicInput').addEventListener('keydown', function(evt) {
    if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        addNode();
    }
});

// Toggle connection mode
function toggleConnectionMode() {
    connectionMode = !connectionMode;
    const btn = document.getElementById('connectBtn');
    
    if (connectionMode) {
        btn.innerHTML = '<i class="fa-solid fa-xmark"></i> <span>Cancel Connect</span>';
        btn.style.backgroundColor = '#ff6b6b';
        
        // Cancel other modes
        if (deleteMode) toggleDeleteMode();
    } else {
        btn.innerHTML = '<i class="fa-solid fa-link"></i><br> <span>Connect Topics</span>';
        btn.style.backgroundColor = '';
        if (selectedNode) {
            selectedNode.removeClass('selected');
            selectedNode = null;
        }
    }
}

// Toggle delete connection mode
function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const btn = document.getElementById('deleteBtn');
    
    if (deleteMode) {
        btn.textContent = '❌ Cancel Delete';
        btn.style.backgroundColor = '#ff0000';
        
        cy.edges().addClass('deletable');
        
        // Cancel other modes
        if (connectionMode) toggleConnectionMode();
        if (doubleClickMode && doubleClickSource) {
            doubleClickSource.removeClass('drag-source');
            doubleClickSource.removeStyle('border-color border-width');
            doubleClickMode = false;
            doubleClickSource = null;
        }
        
        console.log('Delete mode ON - Click on any connection to delete it');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-eraser"></i><br><span>Delete Connection</span>';
        btn.style.backgroundColor = '#ff6b6b';
        
        cy.edges().removeClass('deletable');
        
        console.log('Delete mode OFF');
    }
}

// Add node function
function addNode() {
    const text = document.getElementById('topicInput').value.trim();
    
    if (!text) {
        document.getElementById('error').innerHTML = "⚠️ Please enter a topic.";
        document.getElementById('error').style.fontSize = '0.9rem';
        document.getElementById('error').style.color = '#2e2e2e';
        document.getElementById('error').style.marginTop = '1rem';

        return;
    } else {
        document.getElementById('error').innerHTML = "";
    }
    
    if (cy.getElementById(text).length > 0) {
        document.getElementById('error').innerHTML = "Topic already exists.";
        return;
    }
    
    cy.add({
        group: 'nodes',
        data: { 
            id: text, 
            label: text,
            labelLength: text.length  // Simple length calculation
        },
        position: { x: Math.random() * 700, y: Math.random() * 400 }
    });
    
    document.getElementById('topicInput').value = '';
}

// Get connections
function getConnections() {
    return cy.edges().map(edge => ({
        id: edge.id(),
        source: edge.source().id(),
        target: edge.target().id(),
        sourceLabel: edge.source().data('label'),
        targetLabel: edge.target().data('label')
    }));
}

// Show connections
function showConnections() {
    console.log('Current connections:', getConnections());
}

// Save mind map to localStorage
function saveMindMap() {
    const mindMapData = {
        nodes: cy.nodes().map(node => ({
            id: node.id(),
            label: node.data('label'),
            position: node.position(),
            labelLength: node.data('labelLength') || node.data('label').length
        })),
        edges: cy.edges().map(edge => ({
            id: edge.id(),
            source: edge.source().id(),
            target: edge.target().id()
        })),
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('mindMapData', JSON.stringify(mindMapData));
    
    // Visual feedback
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Saved!';
    btn.style.backgroundColor = '#4CAF50';
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '#4CAF50';
    }, 1500);
    
    updateSaveStatus();
    console.log('Mind map saved to localStorage!');
}

// Load mind map from localStorage
function loadMindMap() {
    const savedData = localStorage.getItem('mindMapData');
    
    if (!savedData) {
        // alert('No saved mind map found in memory!');
        showCustomAlert('No saved mind map found in memory!');
        return;
    }
    
    try {
        const mindMapData = JSON.parse(savedData);
        
        // Clear current mind map
        cy.elements().remove();
        
        // Add saved nodes
        mindMapData.nodes.forEach(nodeData => {
            cy.add({
                group: 'nodes',
                data: {
                    id: nodeData.id,
                    label: nodeData.label,
                    labelLength: nodeData.labelLength
                },
                position: nodeData.position
            });
        });
        
        // Add saved edges
        mindMapData.edges.forEach(edgeData => {
            cy.add({
                group: 'edges',
                data: {
                    id: edgeData.id,
                    source: edgeData.source,
                    target: edgeData.target
                }
            });
        });
        
        // Visual feedback
        const btn = event.target;
        // const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check" style="color:#6ad790;"></i><br>Loaded!';

        
        setTimeout(() => {
            btn.innerHTML = btn.dataset.originalHtml; 
        }, 1500);
        
        console.log('Mind map loaded from memory!');
        
    } catch (error) {
        // alert('Error loading mind map: ' + error.message);
        showCustomAlert('Error loading mind map: ' + error.message);
        localStorage.removeItem('mindMapData');
    }
}

// Clear current mind map AND localStorage
function clearMindMap() {
    if (confirm('Are you sure you want to clear the entire mind map? This will also delete your saved data.')) {
        cy.elements().remove();
        localStorage.removeItem('mindMapData');
        
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Cleared!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 1500);
        
        updateSaveStatus();
        console.log('Mind map and saved data cleared!');
    }
}

// Check if saved data exists
function hasSavedData() {
    return localStorage.getItem('mindMapData') !== null;
}

// Update save status indicator
function updateSaveStatus() {
    const statusDiv = document.getElementById('saveStatus');
    if (statusDiv) {
        if (hasSavedData()) {
            const savedData = JSON.parse(localStorage.getItem('mindMapData'));
            const saveTime = new Date(savedData.timestamp).toLocaleString();
            statusDiv.innerHTML = `💾 Last saved: ${saveTime}`;
            statusDiv.style.color = '#2e2e2eff';
            statusDiv.style.marginTop = '1rem';
        } else {
            statusDiv.innerHTML = '❌ No saved data';
            statusDiv.style.color = '#3e3e3eff';
            statusDiv.style.marginTop = '0.8rem';
        }
    }
}

// Auto-load saved mind map on page load
window.addEventListener('load', function() {
    updateSaveStatus();
    
    if (hasSavedData()) {
        const savedData = JSON.parse(localStorage.getItem('mindMapData'));
        const saveTime = new Date(savedData.timestamp).toLocaleString();
        
        const loadOnStart = confirm(`Found saved mind map from ${saveTime}. Load it?`);
        if (loadOnStart) {
            loadMindMap();
        }
    }
});




//to show and hide the alert
// Get modal elements
const customAlert = document.getElementById('customAlert');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertClose = document.getElementById('customAlertClose');
const customAlertOkay = document.getElementById('customAlertOkay');

// Show custom alert with a message
function showCustomAlert(message) {
  customAlertMessage.textContent = message;
  customAlert.style.display = 'flex';
}

// Hide the custom alert
function hideCustomAlert() {
  customAlert.style.display = 'none';
}

// Event listeners for closing the modal
// customAlertClose.onclick = hideCustomAlert;
customAlertOkay.onclick = hideCustomAlert;
window.onclick = function(event) {
  if (event.target === customAlert) {
    hideCustomAlert();
  }
};



