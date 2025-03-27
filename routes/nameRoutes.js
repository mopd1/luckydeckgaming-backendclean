// routes/nameRoutes.js
const express = require('express');
const router = express.Router();

// Sample name lists - in production these would be from a database
const nameData = {
  first_name: [
    "Jack", "James", "John", "Robert", "Michael", "William", "David", "Richard", "Thomas", "Charles",
    "Lucy", "Emma", "Olivia", "Ava", "Emily", "Abigail", "Madison", "Elizabeth", "Charlotte", "Sophia"
  ],
  surname: [
    "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
    "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson"
  ],
  nickname: [
    "Ace", "Buzz", "Chief", "Duke", "Flash", "Gator", "Hawk", "Iceman", "Joker", "King",
    "Lucky", "Maverick", "Nitro", "Outlaw", "Phoenix", "Ranger", "Slick", "Tango", "Viper", "Wizard"
  ]
};

// GET /api/names/random
router.get('/random', (req, res) => {
  const { type } = req.query;
  
  if (!type || !nameData[type]) {
    return res.status(400).json({ message: 'Invalid name type' });
  }
  
  const nameList = nameData[type];
  const randomIndex = Math.floor(Math.random() * nameList.length);
  const randomName = nameList[randomIndex];
  
  return res.json({ name: randomName });
});

module.exports = router;
