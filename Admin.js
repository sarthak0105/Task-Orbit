// Access the DOM elements
const budgetInput = document.getElementById('total-budget');
const allocSpan = document.getElementById('allocated-budget');
const remSpan  = document.getElementById('remaining-budget');
const budgetChart = document.getElementById('budget-chart');
const percentageText = document.getElementById('percentage');




function updateChart(percentage) {
    budgetChart.style.background = `conic-gradient(
        #FED36A ${percentage * 3.6}deg,
        #02021C ${percentage * 3.6}deg
    )`;
    percentageText.textContent = `${Math.round(percentage)}% used`;
}

// Function to submit and set the total budget
async function submitBudget() {
    const totalBudget = parseFloat(budgetInput.value);
    if (isNaN(totalBudget) || totalBudget <= 0) {
        alert("Please enter a valid budget amount.");
        return;
    }

    try {
        const response = await fetch('/set-budget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ budget: totalBudget })
        });

        if (!response.ok) throw new Error("Failed to save total budget.");
        alert("Total budget saved successfully!");

        // Update the chart to reflect the new budget value
        updateChart(0);  // Initial state; further customization possible
    } catch (error) {
        console.error("Error saving total budget:", error);
    }
}


// Function to load and display the stored total budget on page load
async function loadTotalBudget() {
    try {
        const response = await fetch('/get_total-budget');
        if (!response.ok) throw new Error("Failed to fetch budget data.");
        
        const { totalBudget, allocatedBudget } = await response.json();
        budgetInput.value = totalBudget || ''; // Display total budget in the input field
        allocSpan.textContent = allocatedBudget || '0';
        // Calculate remaining budget and update display
        const remainingBudget = totalBudget - allocatedBudget;
        remSpan.textContent = remainingBudget || '0';
        
        // Calculate and update the used budget percentage
        const usedPercentage = totalBudget ? (allocatedBudget / totalBudget) * 100 : 0;
        updateChart(usedPercentage); // Update pie chart with used budget percentage
    } catch (error) {
        console.error("Error fetching total budget:", error);
    }
}

// Initial call to load the budget data when the page loads
document.addEventListener('DOMContentLoaded', loadTotalBudget);




