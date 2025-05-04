document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('comparison-form');
    const itemAInput = document.getElementById('item_a');
    const itemBInput = document.getElementById('item_b');
    const submitButton = document.getElementById('submit-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsSection = document.getElementById('results-section');
    const explanationText = document.getElementById('explanation-text');
    const chartCanvas = document.getElementById('result-chart');
    const historyList = document.getElementById('history-list');
    const errorMessage = document.getElementById('error-message');
    const summaryTextElement = document.getElementById('summary-text'); // Get summary element
    const proportionalCirclesContainer = document.getElementById('proportional-circles-container'); // Get circles container

    let resultChart = null; // To hold the Chart.js instance

    // --- Function to update the chart ---
    function updateChart(labelA, labelB, value) {
        const ctx = chartCanvas.getContext('2d');

        if (resultChart) {
            resultChart.destroy(); // Destroy previous chart instance
        }

        // Determine a reasonable max value for the scale
        let maxValue = 10; // Default max
        if (value > 0) {
             // Set max slightly higher than the value for better visualization
             maxValue = Math.ceil(value * 1.2);
             // If value is very small, ensure a minimum scale
             if (maxValue < 5) maxValue = 5;
             // If value is 1 or less, maybe a specific scale makes sense
             if (value <= 1) maxValue = 2;

        } else if (value === 0) {
            maxValue = 1; // Show a zero bar clearly
        } else {
            // Handle null/undefined/negative value (though negative doesn't make sense here)
             maxValue = 10; // Default if no value
             value = 0; // Treat null as 0 for the chart
        }


        resultChart = new Chart(ctx, {
            type: 'bar', // Use bar chart
            data: {
                // Use Item B as the main reference label if desired, or keep simple
                 // labels: [labelB], // Label for the x-axis category
                labels: [`${labelA} in ${labelB}`], // More descriptive label
                datasets: [{
                    label: `How many '${labelA}' fit in one '${labelB}'`, // Dataset label
                    data: [value], // The calculated value
                    backgroundColor: [
                        'rgba(25, 118, 210, 0.6)', // Blue color for the bar
                    ],
                    borderColor: [
                        'rgba(25, 118, 210, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Make bars horizontal for potentially long labels
                 responsive: true,
                 maintainAspectRatio: false, // Allow chart to fill container height
                 scales: {
                     x: { // Now the value axis is X
                         beginAtZero: true,
                         max: maxValue, // Set dynamic max value
                         title: {
                             display: true,
                             text: 'Quantity'
                         }
                     },
                     y: { // Category axis is Y
                         title: {
                             display: false // Hide y-axis title if label is descriptive enough
                         }
                     }
                 },
                plugins: {
                    legend: {
                        display: false // Hide legend if only one dataset
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                    // Format number for readability
                                    label += context.parsed.x.toLocaleString();
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Function to draw proportional circles illustration ---
    function drawCircles(container, itemALabel, itemBLabel, value) {
        container.innerHTML = ''; // Clear previous SVG

        // Basic validation for the ratio value
        if (value === null || value === undefined || isNaN(value) || value < 0) {
            container.innerHTML = '<p style="text-align: center; color: #888; padding: 10px;">Cannot visualize ratio: Invalid or non-positive result value received.</p>';
            console.warn("drawCircles: Invalid value received:", value);
            return;
        }
        // Handle zero case separately - draw only outer circle
        if (value === 0) {
             container.innerHTML = '<p style="text-align: center; color: #888; padding: 10px;">Ratio is zero, cannot draw inner circle.</p>';
             // Optionally draw just the outer circle here if desired
             return;
        }

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute('viewBox', '0 0 200 100');
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';

        // --- Calculate Radii based on Area Ratio --- 
        // 'value' is how many A fit in B (B/A)
        // Area ratio (AreaA / AreaB) is conceptually 1 / value
        // Radius ratio (RadiusA / RadiusB) = sqrt(AreaA / AreaB) = sqrt(1 / value)

        let radiusB = 45; // Outer circle radius (relative to viewBox)
        let radiusA;

        // Prevent sqrt of negative/zero and division by zero
        if (value <= 0) {
             console.error("drawCircles: Cannot calculate sqrt for value <= 0");
             radiusA = 0; // Or handle error differently
        } else {
            radiusA = radiusB * Math.sqrt(1 / value); 
        }
       
        console.log(`Circle Radii Calculation: Value=${value}, RadiusB=${radiusB}, Calculated RadiusA=${radiusA}`);

        // Clamp radiusA to ensure visibility
        const minRadiusFactor = 0.05; // Inner circle at least 5% of outer radius
        const maxRadiusFactor = 5.0; // Allow inner circle to be larger if value < 1, up to 5x outer radius
        
        radiusA = Math.max(radiusA, radiusB * minRadiusFactor);
        radiusA = Math.min(radiusA, radiusB * maxRadiusFactor);
        
        console.log(`Clamped RadiusA: ${radiusA}`);

        // --- Draw Circles --- 
        // Outer Circle (Item B)
        const circleB = document.createElementNS(svgNS, "circle");
        circleB.setAttribute('cx', '100');
        circleB.setAttribute('cy', '50');
        circleB.setAttribute('r', radiusB);
        circleB.setAttribute('fill', 'rgba(25, 118, 210, 0.2)');
        circleB.setAttribute('stroke', 'rgba(25, 118, 210, 1)');
        circleB.setAttribute('stroke-width', '1');

        // Inner Circle (Item A)
        const circleA = document.createElementNS(svgNS, "circle");
        circleA.setAttribute('cx', '100');
        circleA.setAttribute('cy', '50');
        circleA.setAttribute('r', radiusA);
        circleA.setAttribute('fill', 'rgba(255, 87, 34, 0.5)');
        circleA.setAttribute('stroke', 'rgba(255, 87, 34, 1)');
        circleA.setAttribute('stroke-width', '1');

        // --- Draw Labels --- 
        // Text Label for Outer Circle (Item B)
        const textB = document.createElementNS(svgNS, "text");
        textB.setAttribute('x', '100');
        textB.setAttribute('y', '95');
        textB.setAttribute('text-anchor', 'middle');
        textB.setAttribute('font-size', '8');
        textB.setAttribute('fill', '#333');
        textB.textContent = itemBLabel;

        // Text Label for Inner Circle (Item A)
        const textA = document.createElementNS(svgNS, "text");
        textA.setAttribute('x', '100');
        // Adjust Y position based on radius to keep it near the center of the inner circle
        const textAYPosition = 50 + Math.min(radiusA * 0.5, 4); // Place within inner circle, adjust font size
        textA.setAttribute('y', textAYPosition);
        textA.setAttribute('text-anchor', 'middle');
        textA.setAttribute('font-size', Math.max(Math.min(radiusA * 0.3, 6), 3)); // Scale font size slightly
        textA.setAttribute('fill', '#000');
        textA.textContent = itemALabel;

        // Append in order (B behind A)
        svg.appendChild(circleB);
        svg.appendChild(circleA);
        svg.appendChild(textB);
        svg.appendChild(textA);
        container.appendChild(svg);
    }

    // --- Function to display results ---
    function displayResults(data) {
        console.log("Received data for display:", JSON.stringify(data, null, 2));

        explanationText.textContent = data.explanation || "No explanation provided.";

        let value = 0;
        let valueFormatted = "N/A";
        // Use nullish coalescing for default value if parsing failed (result_value could be null from backend)
        const resultValueFromData = data.result_value ?? NaN; // Treat null/undefined as NaN
        if (!isNaN(resultValueFromData)) {
            value = parseFloat(resultValueFromData);
            valueFormatted = value.toLocaleString();
            console.log("Parsed result_value for chart and summary:", value);
        } else {
            console.warn("result_value is null, undefined, or not a number. Using 0/N/A.", data.result_value);
            value = 0;
            valueFormatted = "An unknown number of";
        }

        const itemA = typeof data.item_a === 'string' ? data.item_a : 'items';
        const itemB = typeof data.item_b === 'string' ? data.item_b : 'container';

        // Update Summary Text
        summaryTextElement.textContent = `${valueFormatted} ${itemA}(s) fit inside one ${itemB}`;

        // Update Bar Chart
        updateChart(itemA, itemB, value);

        // Draw Conceptual Circles Illustration
        drawCircles(proportionalCirclesContainer, itemA, itemB, value);

        // Show results section using display property
        resultsSection.style.display = 'flex';
        errorMessage.style.display = 'none';
    }

     // --- Function to display error messages ---
    function displayError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        resultsSection.style.display = 'none'; // Hide results section on error
    }

    // --- Form Submission Handler ---
    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission

        const itemA = itemAInput.value.trim();
        const itemB = itemBInput.value.trim();

        if (!itemA || !itemB) {
            displayError("Please fill in both fields.");
            return;
        }

        // Show loading state, hide results and errors
        submitButton.disabled = true;
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        resultsSection.style.display = 'none'; // Ensure results are hidden before new request

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded', // Standard form encoding
                },
                body: new URLSearchParams({
                    'item_a': itemA,
                    'item_b': itemB
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Calculation successful. Response data:", JSON.stringify(data, null, 2));
                displayResults(data);
                loadHistory(); // Refresh history after successful calculation
            } else {
                console.error("Calculation failed. Error data:", JSON.stringify(data, null, 2));
                displayError(data.error || "An unknown error occurred during calculation.");
            }
        } catch (error) {
            console.error("Fetch error during calculation:", error);
             displayError("Failed to connect to the server. Please try again later.");
        } finally {
            // Hide loading state
            submitButton.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    });

    // --- Function to load history ---
    async function loadHistory() {
        try {
            const response = await fetch('/history');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const history = await response.json();

            historyList.innerHTML = ''; // Clear existing list

            if (history.length === 0) {
                historyList.innerHTML = '<li>No past comparisons yet.</li>';
                return;
            }

            history.forEach(item => {
                const li = document.createElement('li');
                 // Display a concise summary
                 const resultText = item.result_value !== null ? item.result_value.toLocaleString() : 'N/A';
                 li.textContent = `${resultText} ${item.item_a}(s) fit inside one ${item.item_b}`;
                 li.dataset.id = item.id; // Store ID for potential click handling
                 li.title = `Click to view details for comparison #${item.id}`; // Tooltip

                 li.addEventListener('click', async () => {
                     // Fetch and display details for the clicked item
                     console.log(`Fetching history item with ID: ${item.id}`);
                     try {
                         const detailResponse = await fetch(`/history/${item.id}`);
                         if (!detailResponse.ok) {
                             const errorData = await detailResponse.json();
                             console.error(`Error loading history detail for ID ${item.id}:`, errorData);
                             throw new Error(errorData.error || `Failed to load details for ${item.id}`);
                         }
                         const detailData = await detailResponse.json();
                         console.log(`Loaded history detail for ID ${item.id}:`, JSON.stringify(detailData, null, 2));
                         // Reuse displayResults to show the history item's details
                         displayResults(detailData);
                         // Optionally, scroll to the results section
                          resultsSection.scrollIntoView({ behavior: 'smooth' });
                          // Populate input fields with the historic data
                          itemAInput.value = detailData.item_a;
                          itemBInput.value = detailData.item_b;

                     } catch (error) {
                          console.error("Error loading history detail:", error);
                          displayError(`Could not load details: ${error.message}`);
                     }
                 });

                historyList.appendChild(li);
            });
        } catch (error) {
            console.error("Error loading history:", error);
            historyList.innerHTML = '<li>Error loading history.</li>';
        }
    }

    // --- Initial Load ---
    loadHistory();
    console.log("Initializing chart with default values.");
    updateChart('Item A', 'Item B', 0);
    // Results section is hidden by default via CSS (display: none)
    // No need to explicitly hide it here anymore
    // resultsSection.style.visibility = 'hidden';
    // resultsSection.style.opacity = '0';

}); 