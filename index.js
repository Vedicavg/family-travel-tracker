import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
const app = express();
const port = 3000;
env.config();
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let users = [];

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

async function checkVisisted(id) {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [id]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  console.log(countries);
  return countries;
}
app.get("/", async (req, res) => {
  let currentUser = await getCurrentUser();
  const countries = await checkVisisted(currentUserId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});


app.post("/add", async (req, res) => {

  console.log(req.body);
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      let currentUser = await getCurrentUser();

      const countries = await checkVisisted(currentUserId);
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error: "Country already visited!"
      });

    }
  } catch (err) {
    console.log(err);
    let currentUser = getCurrentUser();
    const countries = await checkVisisted(currentUserId);
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Enter correct country name!"
    });
  }
});
app.post("/user", async (req, res) => {

  currentUserId = req.body["user"];

  let currentUser = await getCurrentUser();
  if (currentUser) {
    const countries = await checkVisisted(currentUserId);
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
    });
  }
  else{
    res.render("new.ejs");
  }

});

app.post("/new", async (req, res) => {

  console.log(req.body);

  try {
    const result = await db.query("INSERT INTO users (name,color) VALUES ($1,$2) RETURNING *;",[req.body.name,req.body.color]);

    currentUserId = result.rows[0].id;

    res.redirect('/');
  } catch (error) {
    console.error("Error executing query",err.stack);
  }

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
