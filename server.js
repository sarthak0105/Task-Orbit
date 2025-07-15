const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const app = express();
const multer = require('multer');

// Serve static files from TaskOrbit2 directory
app.use(express.static(path.join(__dirname)));

// MongoDB connection URL and database name
const url = 'mongodb+srv://parthgote:whC50ms9WaGP8S8A@cluster0.fclyu.mongodb.net/';
const dbName = 'test';

// Configuration cloudinary
cloudinary.config({ cloud_name: 'dgbjfoujr', api_key: '893798748692356', api_secret: 'mH8nRRBZ-CVTnL2IDzdtvfeN5Ck' 
// Click 'View API Keys' above to copy your API secret
});


// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '10mb' }));  // To handle Base64 images

// Session setup
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 * 15000},
  })
);


// Serve the login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login-page.html'));
});




// Serve the Add User Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login-page.html'));
});

// Handle Add User POST Request
// First, create a function to get all existing tasks
async function getAllExistingTasks(db) {
  try {
    // Get a random non-admin user to fetch their tasks
    const sampleUser = await db.collection('users').findOne(
      { role: { $ne: 'admin' } },
      { projection: { tasks: 1 } }
    );
    
    return sampleUser?.tasks || [];
  } catch (error) {
    console.error('Error fetching existing tasks:', error);
    return [];
  }
}

// Modified add-user endpoint
app.post('/add-user', async (req, res) => {
  const { name, email, role, password, avatar, grade, progress, Team, transactions = [] } = req.body;

  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const collection = db.collection('users');

    // Check if user already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      client.close();
      return res.status(400).json({ error: 'User already exists' });
    }

    // Get existing tasks from other users
    const existingTasks = await getAllExistingTasks(db);

    // Format transactions
    const formattedTransactions = transactions.map(transaction => ({
      description: transaction.description,
      amount: parseInt(transaction.amount, 10),
      date: new Date(transaction.date)
    }));

    // Format tasks with current timestamp
    const formattedTasks = existingTasks.map(task => ({
      taskText: task.taskText,
      completed: false, // New user starts with uncompleted tasks
      assignedDate: task.assignedDate // Preserve original assignment date
    }));

     const teamMember = await collection.findOne({ Team });
      const teamBudget = teamMember ? parseFloat(teamMember.budget) || 0 : 0;


    // Create new user document with existing tasks
    const newUser = {
      name,
      email,
      role,
      password,
      avatar,
      grade,
      progress,
      Team,
      transactions: formattedTransactions,
      tasks: formattedTasks,
      budget: teamBudget
    };

    // Insert the new user
    await collection.insertOne(newUser);
    

    // Update the allocated budget in the admin document
        if (teamBudget > 0) {
            await collection.updateOne(
                { role: "admin" },
                { $inc: { allocatedBudget: teamBudget } }
            );
        }

        client.close();
        
    

    res.redirect('/admin');
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Handle login POST request
app.post('/login', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection('users');

    const user = await collection.findOne({ name, email, password });

    if (user) {
      req.session.user = user;

      if (user.role === 'admin') {
        res.redirect('/admin');
      } 
      else {
        res.redirect('/home');
      }
    } else {
      res.send('Invalid name, email or password!');
    }

    client.close();
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Serve the home page
app.get('/home', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'Home_page.html'));
  } else {
    res.redirect('/');
  }
});

//Serve the admin page
app.get('/admin', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    res.sendFile(path.join(__dirname, 'Admin.html'));
  } else {
    res.redirect('/');
  }
});


// Handle logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/');
  });
});



// Serve the profile page (where the avatar will be shown)
app.get('/profile', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'profile.html'));
  } else {
    res.redirect('/');
  }
});

// Route to fetch the logged-in user data (including avatar)
app.get('/getUser', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// Handle profile picture upload (Base64 image)
app.post('/upload-avatar', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection('users');

    // Update the logged-in user's avatar
    const updatedUser = await collection.findOneAndUpdate(
      { email: req.session.user.email },  // Assuming email is unique
      { $set: { avatar: image } },
      { returnOriginal: false }
    );

    // Update the session with the new avatar
    req.session.user = updatedUser.value;

    res.json({ message: 'Avatar uploaded successfully', user: updatedUser.value });

    client.close();
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Fetch user data (including grade and progress)
app.get('/getUser', async (req, res) => {
    if (req.session.user) {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const user = await db.collection('users').findOne({ email: req.session.user.email });
        client.close();
        res.json(user);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// Save progress and grade to the database
app.post('/saveProgress', async (req, res) => {
    if (req.session.user) {
        const { progress, grade } = req.body;
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        await db.collection('users').updateOne({ email: req.session.user.email }, { $set: { progress, grade } });
        client.close();
        res.json({ success: true });
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});


// Fetch team members based on the selected team
app.get('/getTeamMembers', async (req, res) => {
  if (req.session.user) {
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db(dbName);
      const collection = db.collection('users');

      // Get the team parameter from the query string
      const selectedTeam = req.query.team.toLowerCase();

      // Find all members with a matching team name (case-insensitive)
      const teamMembers = await collection.find({ Team: { $regex: new RegExp(`^${selectedTeam}$`, 'i') } }).toArray();

      client.close();
      res.json(teamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});


// Fetch leaderboard data (sorted by progress, excluding admins)
app.get('/leaderboard-display', async (req, res) => {
  if (req.session.user) {
    try {
      const client = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      const db = client.db(dbName);
      const collection = db.collection('users');

      // Exclude users with the role "admin" and sort by progress in descending order
      const leaderboardData = await collection
        .find({ role: { $nin: ['admin', 'guest'] } }) // Exclude admins
        .sort({ progress: -1 })           // Sort by progress in descending order
        .project({ name: 1, progress: 1 }) // Select only name and progress fields
        .toArray();

      client.close();
      res.json(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});



app.get('/leaderboard', async (req, res) => {
  if (req.session.user) {
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db(dbName);
      const collection = db.collection('users');

      // Fetch users, grouped by team, excluding admin and guest roles
      const users = await collection
        .find({ role: { $nin: ['admin', 'guest'] } })
        .project({ name: 1, progress: 1, Team: 1 })
        .toArray();

      // Group users by their teams
      const teams = users.reduce((acc, user) => {
        if (!acc[user.Team]) acc[user.Team] = [];
        acc[user.Team].push(user);
        return acc;
      }, {});

      // Sort each team's members by progress and assign rankings
      const rankedTeams = Object.keys(teams).map(team => ({
        team,
        members: teams[team]
          .sort((a, b) => b.progress - a.progress) // Sort by progress descending
          .map((user, index) => ({ ...user, rank: index + 1 })) // Assign rank
      }));

      client.close();
      res.json(rankedTeams);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});






// Store transaction and update total expenses
app.post('/transaction', async (req, res) => {
  if (req.session.user) {
    const { description, amount } = req.body;
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db(dbName);
      const usersCollection = db.collection('users');

      // Calculate new total expenses and expense percentage
      const user = await usersCollection.findOne({ email: req.session.user.email });
      const totalBudget = 100000;
      const newTotalExpenses = (user.totalExpenses || 0) + amount;
      const expensePercentage = (newTotalExpenses / totalBudget) * 100;

      // Update user with new transaction history and total expenses
      await usersCollection.updateOne(
        { email: req.session.user.email },
        {
          $push: { transactions: { description, amount, date: new Date() } },
          $set: { totalExpenses: newTotalExpenses, expensePercentage },
        }
      );

      client.close();
      res.json({ success: true, totalExpenses: newTotalExpenses, expensePercentage });
    } catch (error) {
      console.error('Error storing transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// Fetch transaction history and expense percentage
app.get('/getTransactions', async (req, res) => {
  if (req.session.user) {
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db(dbName);
      const user = await db.collection('users').findOne({ email: req.session.user.email });
      client.close();
      res.json({ transactions: user.transactions || [], expensePercentage: user.expensePercentage || 0 });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});


// Calculate average progress of all users
app.get('/leaderboard-avg', async (req, res) => {
  if (req.session.user) {
    try {
      const client = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      const db = client.db(dbName);
      const collection = db.collection('users');

      // Fetch all users excluding admins and guests
      const users = await collection
        .find({ role: { $nin: ['admin', 'guest'] } })
        .project({ progress: 1 })
        .toArray();

      // Calculate the average progress
      const totalProgress = users.reduce((sum, user) => sum + (user.progress || 0), 0);
      const averageProgress = users.length ? totalProgress / users.length : 0;

      client.close();

      // Return the average progress
      res.json({ averageProgress });
    } catch (error) {
      console.error('Error calculating average progress:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});












// Add these routes to your server.js file

// Modified assign-task endpoint to handle duplicate prevention
app.post('/assign-task', async (req, res) => {
  const { taskText } = req.body;
  
  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection('users');
    
    // Create new task object
    const newTask = {
      taskText: taskText,
      completed: false,
      assignedDate: new Date()
    };
    
    // Add task to all non-admin users who don't already have it
    await collection.updateMany(
      { 
        role: { $ne: 'admin' },
        'tasks.taskText': { $ne: taskText } // Only add if task doesn't exist
      },
      { 
        $push: { 
          tasks: newTask 
        }
      }
    );
    
    client.close();
    res.json({ success: true, message: 'Task assigned successfully' });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get user's tasks
app.get('/user-tasks', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection('users');
    
    const user = await collection.findOne(
      { email: req.session.user.email },
      { projection: { tasks: 1 } }
    );
    
    client.close();
    res.json({ tasks: user.tasks || [] });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update task completion status
app.post('/update-task', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { taskText, completed } = req.body;
  
  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db(dbName);
    const collection = db.collection('users');
    
    await collection.updateOne(
      { 
        email: req.session.user.email,
        'tasks.taskText': taskText
      },
      { 
        $set: { 
          'tasks.$.completed': completed 
        }
      }
    );
    
    client.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});







app.post('/allocate-budget', async (req, res) => {
    const { team, amount } = req.body;
    const budgetPerPerson = parseFloat(amount);

    if (isNaN(budgetPerPerson) || budgetPerPerson <= 0) {
        return res.status(400).json({ success: false, message: "Invalid budget amount." });
    }

    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        // Retrieve admin's total and allocated budgets
        const adminData = await usersCollection.findOne({ role: "admin" });
        const totalBudget = adminData.totalBudget || 0;
        const allocatedBudget = adminData.allocatedBudget || 0;

        // Count team members and calculate the total allocation
        const teamMembers = await usersCollection.find({ Team: team }).toArray();
        const teamCount = teamMembers.length;
        const totalAllocation = budgetPerPerson * teamCount;

        // Ensure allocation does not exceed total budget
        if (allocatedBudget + totalAllocation > totalBudget) {
            client.close();
            return res.status(400).json({ success: false, message: "Allocation exceeds remaining budget." });
        }

        // Update each team member's budget and increment allocated budget in admin document
        await usersCollection.updateMany(
            { Team: team },
            { $set: { budget: budgetPerPerson } }
        );

        await usersCollection.updateOne(
            { role: "admin" },
            { $set: { allocatedBudget: allocatedBudget + totalAllocation } }
        );

        client.close();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error in budget allocation:", error);
        res.status(500).json({ success: false, message: "Failed to allocate budget." });
    }
});











app.get('/get-budget', async (req, res) => {
  if (req.session.user) {
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db(dbName);
      const user = await db.collection('users').findOne({ email: req.session.user.email });

      client.close();
      res.json({ budget: user.budget || 0 });
    } catch (error) {
      console.error('Error fetching budget:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});










app.post('/set-budget', async (req, res) => {
    const { budget } = req.body;
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        // Initialize totalBudget and reset allocatedBudget
        await usersCollection.updateOne(
            { role: "admin" },
            { $set: { totalBudget: budget, allocatedBudget: 0 } },
            { upsert: true }
        );

        client.close();
        res.status(200).send("Total budget set and allocated budget reset.");
    } catch (error) {
        console.error("Error setting total budget:", error);
        res.status(500).send("Failed to set total budget.");
    }
});




app.get('/get_total-budget', async (req, res) => {
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        // Retrieve budget details from the admin document
        const adminData = await usersCollection.findOne({ role: "admin" });

        res.json({
            totalBudget: adminData?.totalBudget || 0,
            allocatedBudget: adminData?.allocatedBudget || 0,
            remainingBudget: (adminData?.totalBudget || 0) - (adminData?.allocatedBudget || 0)
        });

        client.close();
    } catch (error) {
        console.error("Error fetching budget data:", error);
        res.status(500).json({ error: "Failed to retrieve budget data." });
    }
});






app.post('/save-event', async (req, res) => {
    const { eventname, date, location, description } = req.body;

    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        

        // Update event document or insert if not existing
        await usersCollection.updateOne(
            { role: "admin" }, // Use a fixed ID for single event management
            { $set: { eventname, date, location, description } },
            { upsert: true }
        );

        client.close();
        res.status(200).json({ message: "Event information saved successfully." });
    } catch (error) {
        console.error("Error saving event information:", error);
        res.status(500).json({ message: "Failed to save event information." });
    }
});






app.get('/get-event', async (req, res) => {
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        const adminData = await usersCollection.findOne({ role: "admin" });
        client.close();

        res.json(adminData || {});
    } catch (error) {
        console.error("Error fetching event information:", error);
        res.status(500).json({ message: "Failed to fetch event information." });
    }
});







// Route to save guest user data
app.post('/save-guest', async (req, res) => {
    const { first_name, last_name, email, phone } = req.body;

    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        // Insert guest user data into "users" collection
        await usersCollection.insertOne({ name: `${first_name} ${last_name}`, email, phone, role: 'guest' });

        client.close();
        res.status(200).send('Guest data saved');
    } catch (error) {
        console.error('Error saving guest data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display the payment page with QR code
app.get('/payment-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});














// Route to update registration counts
app.post('/update-registrations', async (req, res) => {
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        // Retrieve current counts from the admin document
        const adminData = await usersCollection.findOne({ role: "admin" });
        const totalRegistrations = adminData.totalRegistrations || 2000;
        const confirmedRegistrations = (adminData.confirmedRegistrations || 0) + 1;
        const remainingRegistrations = totalRegistrations - confirmedRegistrations;

        // Update the admin document with new counts
        await usersCollection.updateOne(
            { role: "admin" },
            { $set: { confirmedRegistrations, remainingRegistrations, totalRegistrations } }
        );

        client.close();
        res.status(200).send("Registration counts updated successfully.");
    } catch (error) {
        console.error("Error updating registration counts:", error);
        res.status(500).send("Failed to update registration counts.");
    }
});




// Route to get registration data
app.get('/get-registrations', async (req, res) => {
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        // Retrieve total registrations from the admin document
        const adminData = await usersCollection.findOne({ role: "admin" });
        const totalRegistrations = adminData.totalRegistrations || 2000;

        // Count confirmed registrations based on guest users
        const confirmedRegistrations = await usersCollection.countDocuments({ role: "guest" });

        // Calculate remaining registrations
        const remainingRegistrations = totalRegistrations - confirmedRegistrations;

        res.json({
            totalRegistrations,
            confirmedRegistrations,
            remainingRegistrations
        });

        client.close();
    } catch (error) {
        console.error("Error fetching registration data:", error);
        res.status(500).json({ message: "Failed to retrieve registration data." });
    }
});


// Route to update the total registrations count
app.post('/update-total-registrations', async (req, res) => {
    const { totalRegistrations } = req.body;
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        await usersCollection.updateOne(
            { role: "admin" },
            { $set: { totalRegistrations } }
        );

        client.close();
        res.status(200).send("Total registrations updated successfully.");
    } catch (error) {
        console.error("Error updating total registrations:", error);
        res.status(500).send("Failed to update total registrations.");
    }
});





// Example Node.js route
app.post('/post-announcement', async (req, res) => {
    const { announcement } = req.body;
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    if (!announcement) return res.status(400).send('Announcement content required');

    try {
        await db.collection('users').updateOne(
            { role: 'admin' },
            { $push: { announcements: { text: announcement, time: new Date() } } }
        );
        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false });
    }
});





app.get('/get-announcements', async (req, res) => {

    try {
	     const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        const admin = await db.collection('users').findOne({ role: 'admin' });
        res.status(200).json({ announcements: admin.announcements || [] });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false });
    }
});

app.post('/save-qr-code', async (req, res) => {
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        const { qrCodeDataUrl } = req.body;
        await usersCollection.updateOne({ role: 'admin' }, { $set: { qrImg: qrCodeDataUrl } });
        res.status(200).send('QR Code saved successfully');
    } catch (error) {
        console.error('Error saving QR code to database:', error);
        res.status(500).send('Server error');
    }
});


app.get('/get-qr-code', async (req, res) => {
    try {

        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        const admin = await db.collection('users').findOne({ role: 'admin' });
        if (admin && admin.qrImg) {
            res.json({ qrImg: admin.qrImg });
        } else {
            res.status(404).send('QR Code not found');
        }
    } catch (error) {
        console.error('Error retrieving QR code from database:', error);
        res.status(500).send('Server error');
    }
});










app.get('/user-details', async (req, res) => {
  const username = req.query.username;

  if (req.session.user && username) {
    try {
      const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      const db = client.db(dbName);
      const collection = db.collection('users');

      // Find user by name and retrieve necessary fields
      const user = await collection.findOne(
        { name: username },
        { projection: { name: 1, tasks: 1, avatar: 1, grade: 1, progress: 1 } }
      );

      client.close();
      res.json(user);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized or username not provided' });
  }
});




// Route to post a message for a specific user
app.post('/post-message', async (req, res) => {
  const { message, username } = req.body; // Get message and target user's name

  if (!message || !username) return res.status(400).send('Message and username are required');

  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find and update the specified user's document with the new message
    await usersCollection.updateOne(
      { name: username }, // Find user by name
      { $push: { messages: { text: message, time: new Date() } } } // Add to user's "messages" array
    );

    client.close();
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).send({ success: false });
  }
});

app.get('/get-messages', async (req, res) => {
  const username = req.session.user?.name; // Access username from session data

  if (!username) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Find the user by name in the database
    const user = await usersCollection.findOne(
      { name: username },
      { projection: { messages: 1 } } // Retrieve only the messages field
    );

    client.close();

    if (user && user.messages) {
      res.status(200).json({ messages: user.messages });
    } else {
      res.status(404).json({ error: 'No messages found for this user' });
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
