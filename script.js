document.addEventListener('DOMContentLoaded', function () {
    const progressCanvas = document.getElementById('progressCanvas');
    const gradeCanvas = document.getElementById('gradeCanvas');
    const submitButton = document.getElementById('submitProgress');
    
    // Function to draw circular progress
    function drawCircle(canvas, percentage, text) {
        const ctx = canvas.getContext('2d');
        const radius = canvas.width / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background circle
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 3, 0, 2 * Math.PI);
        ctx.strokeStyle = '#FED36A';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw progress arc
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 3, 0, 2 * Math.PI * (percentage / 100));
        ctx.strokeStyle = '#02021C';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw text
        ctx.font = '20px Arial';
        ctx.fillStyle = '#2B3A45';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, radius, radius);
    }

    // Function to calculate grade based on progress
    function calculateGrade(progress) {
        if (progress >= 90) return 'A+';
        if (progress >= 75) return 'A';
        if (progress >= 60) return 'B';
        if (progress >= 40) return 'C';
        return 'F';
    }

    // Function to update progress and grade based on completed tasks
    function updateProgressAndGrade() {
        const taskCheckboxes = document.querySelectorAll('.task-checkbox');
        const totalTasks = taskCheckboxes.length;
        const completedTasks = Array.from(taskCheckboxes).filter(checkbox => checkbox.checked).length;
        
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const grade = calculateGrade(progress);
        
        // Update visual displays
        drawCircle(progressCanvas, progress, `${progress}%`);
        drawCircle(gradeCanvas, progress, grade);
        
        return { progress, grade };
    }

    // Modified loadUserTasks function to include progress tracking
    async function loadUserTasks() {
        try {
            const response = await fetch('/user-tasks');
            const data = await response.json();
            
            const taskList = document.getElementById('task-list');
            taskList.innerHTML = ''; // Clear existing tasks
            
            // Display tasks from database
            data.tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'back-col';
                
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = task.completed;
                
                // Add change event listener for checkbox
                checkbox.addEventListener('change', async (e) => {
                    try {
                        await fetch('/update-task', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                taskText: task.taskText,
                                completed: e.target.checked
                            })
                        });
                        // Update progress immediately when checkbox changes
                        updateProgressAndGrade();
                    } catch (error) {
                        console.error('Error updating task:', error);
                    }
                });
                
                li.appendChild(checkbox);
                li.appendChild(document.createTextNode(' ' + task.taskText));
                taskItem.appendChild(li);
                taskList.appendChild(taskItem);
            });
            
            // Update progress after loading tasks
            updateProgressAndGrade();
            
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    // Submit button event listener
    submitButton.addEventListener('click', async () => {
        const { progress, grade } = updateProgressAndGrade();

        // Save to localStorage
        localStorage.setItem('userProgress', progress);
        localStorage.setItem('userGrade', grade);

        // Save to the database
        try {
            const response = await fetch('/saveProgress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progress, grade })
            });
            
            const data = await response.json();
            if (data.success) {
                alert('Progress saved successfully!');
            }
        } catch (err) {
            console.error('Error saving progress:', err);
            alert('Error saving progress. Please try again.');
        }
    });

    // Initial load
    loadUserTasks();
});