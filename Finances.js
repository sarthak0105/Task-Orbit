
document.addEventListener('DOMContentLoaded', async () => {
  const totalBudgetEl = document.getElementById('total-budget');
  const totalExpensesEl = document.getElementById('total-expenses');
  const historyListEl = document.getElementById('history-list');
  const amountInput = document.getElementById('amount-input');
  const useCashBtn = document.getElementById('use-cash');
  const budgetChart = document.getElementById('budget-chart');

  let totalBudget = 0;
  let totalExpenses = 0;

  // Fetch and display the allocated budget for the team
  async function loadBudget() {
    try {
      const response = await fetch('/get-budget');
      const data = await response.json();
      totalBudget = data.budget || 0;
      totalBudgetEl.textContent = `₹${totalBudget}`;
    } catch (error) {
      console.error('Error fetching budget:', error);
    }
  }

  // Fetch and display transaction history and calculate total expenses
  async function loadTransactions() {
    try {
      const response = await fetch('/getTransactions');
      const data = await response.json();
      data.transactions.forEach(txn => addTransaction(txn.description, txn.amount));
      totalExpenses = data.transactions.reduce((sum, txn) => sum + txn.amount, 0);
      updateExpenses(totalExpenses);
      updateChart((totalExpenses / totalBudget) * 100);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  // Update total expenses display
  function updateExpenses(amount) {
    totalExpensesEl.textContent = `₹${amount}`;
  }

  // Add a transaction to the history list
  // Add a transaction to the history list
function addTransaction(description, amount) {
  const listItem = document.createElement('li');
  listItem.classList.add('transaction-item');
  const descriptionSpan = document.createElement('span');
  descriptionSpan.classList.add('transaction-details');
  descriptionSpan.textContent = description;
  const amountSpan = document.createElement('span');
  amountSpan.classList.add('transaction-amount');
  amountSpan.textContent = `₹${Math.abs(amount)}`;
  amountSpan.classList.add(amount > 0 ? 'positive' : 'negative');
  listItem.appendChild(descriptionSpan);
  listItem.appendChild(amountSpan);
  historyListEl.appendChild(listItem);
}

  // Update the chart based on the expense percentage
  function updateChart(percentage) {
    budgetChart.style.background = `conic-gradient(
      #02021C ${percentage * 3.6}deg,
      #FED36A ${percentage * 3.6}deg
    )`;
    const percentageText = document.createElement('span');
    percentageText.classList.add('percentage-text');
    percentageText.textContent = `${Math.round(percentage)}%`;
    budgetChart.innerHTML = '';
    budgetChart.appendChild(percentageText);
  }

  // Handle transaction addition
  // Handle transaction addition
useCashBtn.addEventListener('click', async () => {
  const description = document.getElementById('transaction-description').value;
  const amount = parseFloat(amountInput.value);
  if (!isNaN(amount) && amount !== 0) {
    try {
      const response = await fetch('/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount })
      });
      const data = await response.json();
      if (data.success) {
        addTransaction(description, amount);
        totalExpenses += amount;
        updateExpenses(totalExpenses);
        updateChart((totalExpenses / totalBudget) * 100);
        amountInput.value = '';
        document.getElementById('transaction-description').value = '';
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }
});

  // Initial data load
  await loadBudget();
  await loadTransactions();
});