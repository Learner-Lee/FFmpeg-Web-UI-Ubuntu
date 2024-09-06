const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const winston = require('winston');
const cron = require('node-cron');
const os = require('os');

const app = express();
const port = 3000;

// Logger configuration with winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/server.log' })
    ]
});

// Schedule log entries every minute
cron.schedule('* * * * *', () => {
    logger.info('Scheduled log entry - server is running smoothly');
});

// Serve static files
app.use(express.static('public'));

// Create upload and output directories if they don't exist
const uploadDir = 'uploads/';
const outputDir = 'outputs/';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Set up Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Route to handle single video file upload and conversion
app.post('/upload', upload.single('video'), (req, res) => {
    const filePath = path.join(uploadDir, req.file.filename);
    const format = req.body.format || 'mp4';
    const resolution = req.body.resolution || '1280x720';
    const bitrate = req.body.bitrate || '1000k';
    const outputFileName = `${Date.now()}.${format}`;
    const outputFilePath = path.join(outputDir, outputFileName);

    const ffmpegCommand = `ffmpeg -i "${filePath}" -vf scale=${resolution} -b:v ${bitrate} "${outputFilePath}"`;

    const ffmpegProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            logger.error(`Error during conversion: ${error.message}`);
            return res.status(500).json({ error: 'Conversion failed.' });
        }
        logger.info(`File converted successfully: ${outputFilePath}`);
        res.json({ message: 'Conversion successful.', outputFileName });
    });

    // Store process in request for potential cancellation
    req.ffmpegProcess = ffmpegProcess;
});

// Route to handle folder upload and conversion
app.post('/upload-folder', upload.array('folder'), (req, res) => {
    const files = req.files;
    const format = req.body.format || 'mp4';
    const resolution = req.body.resolution || '1280x720';
    const bitrate = req.body.bitrate || '1000k';
    
    files.forEach((file) => {
        const filePath = path.join(uploadDir, file.filename);
        const outputFileName = `${Date.now()}-${file.originalname}.${format}`;
        const outputFilePath = path.join(outputDir, outputFileName);

        const ffmpegCommand = `ffmpeg -i "${filePath}" -vf scale=${resolution} -b:v ${bitrate} "${outputFilePath}"`;

        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Error during conversion: ${error.message}`);
                return res.status(500).json({ error: 'Conversion failed for some files.' });
            }
            logger.info(`File converted successfully: ${outputFilePath}`);
        });
    });

    res.json({ message: 'Folder uploaded and conversion initiated.' });
});

// Route to handle conversion cancellation
app.post('/cancel', (req, res) => {
    if (req.ffmpegProcess) {
        req.ffmpegProcess.kill('SIGINT');
        logger.info('Conversion process cancelled.');
        res.json({ message: 'Conversion cancelled.' });
    } else {
        res.status(400).json({ error: 'No active conversion process to cancel.' });
    }
});

// Route to serve list of converted videos
app.get('/videos', (req, res) => {
    fs.readdir(outputDir, (err, files) => {
        if (err) {
            logger.error(`Error reading output directory: ${err.message}`);
            return res.status(500).json({ error: 'Unable to retrieve videos.' });
        }
        const videoFiles = files.map(file => ({ name: file }));
        res.json(videoFiles);
    });
});

// Route to handle video download
app.get('/download/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(outputDir, fileName);
    res.download(filePath, fileName, (err) => {
        if (err) {
            logger.error(`Error during download: ${err.message}`);
            res.status(500).json({ error: 'File download failed.' });
        }
    });
});

// Route to get current CPU usage
app.get('/cpu-usage', (req, res) => {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    cpus.forEach((cpu) => {
        for (type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
    });

    const cpuUsage = 100 - Math.round((idle / total) * 100);
    res.json({ cpuUsage });
});

// Start server
app.listen(port, () => {
    logger.info(`Server started on http://localhost:${port}`);
});


