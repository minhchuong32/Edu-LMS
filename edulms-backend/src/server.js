// require("dotenv").config();

// const dns = require("dns");
// dns.setServers(["8.8.8.8", "1.1.1.1"]);

// const app = require("./app");
// const connectDB = require("./config/database");

// const PORT = process.env.PORT || 5000;

// (async () => {
//     try {
//         await connectDB();

//         app.listen(PORT, () => {
//             console.log(`Server running on http://localhost:${PORT}`);
//         });
//     } catch (err) {
//         console.error(err);
//         process.exit(1);
//     }
// })();


require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();