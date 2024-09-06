### 第一阶段：设置基础环境

**步骤 1：安装必要的工具**

1. **Ubuntu 上安装 FFmpeg**

   ```
   sudo apt update
   sudo apt install ffmpeg
   ```

2. **安装 Node.js 和 npm**

   Node.js 用于运行 JavaScript 代码，npm 是其包管理工具。

   ```
   sudo apt install nodejs npm
   ```

3. **安装 Express.js**

   Express.js 是一个用于构建 Web 应用的轻量级框架。

   ```
   mkdir ffmpeg-webui
   cd ffmpeg-webui
   npm init -y
   npm install express multer
   ```

### 第二阶段：创建前端界面

**步骤 2：构建基本的 Express.js 服务器**

##### **目录结构**

```
ffmpeg-webui/
├── logs/
│   └── server.log            # 存储日志文件
├── public/
│   ├── index.html            # 前端 HTML 文件
│   └── script.js             # 前端 JavaScript 文件
├── uploads/                  # 存储上传的视频文件
├── outputs/                  # 存储转换后的视频文件
├── index.js                  # 主后端逻辑文件
├── package.json              # 项目依赖项和脚本配置文件
├── .gitignore                # Git 忽略文件
└── README.md                 # 项目文档（可选）
```

**目录说明**

- **logs/**: 存放服务器生成的日志文件。`server.log` 文件会记录服务器日志，包括每分钟的定时记录以及请求日志。
- **public/**: 包含前端的静态文件，如 `index.html` 和 `script.js`。
- **uploads/**: 存放用户上传的视频文件。每次上传后，文件会存放在这个目录中。
- **outputs/**: 存放转换后的视频文件。FFmpeg 转换完成后，文件会存放在这个目录中。
- **index.js**: 主要的后端文件，处理所有的路由、文件上传、视频转换、日志记录等功能。
- **package.json**: 包含项目的依赖项 (`express`, `multer`, `winston`, `node-cron`, 等) 以及脚本和元数据。
- **.gitignore**: 配置 Git 忽略文件，避免上传 `node_modules/`、`uploads/`、`outputs/` 目录以及其他临时文件。
- **README.md**: （可选）记录项目的使用说明、依赖项安装、部署步骤等。



##### 1. `index.html` (前端文件)

放在 `public/` 文件夹中，这是前端的 HTML 文件

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FFmpeg Web Interface</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
        }
        h1 {
            text-align: center;
            color: #333;
        }
        form {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }
        select, input[type="file"], button {
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
            border: 1px solid #ccc;
            font-size: 16px;
        }
        progress {
            width: 100%;
            margin-bottom: 20px;
        }
        .cpu-usage {
            margin: 20px 0;
            font-size: 14px;
        }
        .cpu-usage span {
            font-weight: bold;
        }
        .video-list {
            margin-top: 20px;
        }
        .video-list a {
            display: block;
            margin: 5px 0;
            color: #0066cc;
            text-decoration: none;
        }
        .video-list a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>FFmpeg Web Interface</h1>
        <form id="uploadForm" enctype="multipart/form-data">
            <label for="video">Upload Video:</label>
            <input type="file" name="video" accept="video/*" required>

            <label for="format">Choose Output Format:</label>
            <select name="format">
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="avi">AVI</option>
            </select>

            <label for="resolution">Choose Resolution:</label>
            <select name="resolution">
                <option value="1280x720">720p</option>
                <option value="1920x1080">1080p</option>
                <option value="3840x2160">4K</option>
            </select>

            <label for="bitrate">Choose Bitrate:</label>
            <select name="bitrate">
                <option value="1000k">1 Mbps</option>
                <option value="2500k">2.5 Mbps</option>
                <option value="5000k">5 Mbps</option>
            </select>

            <button type="submit">Upload and Convert</button>
        </form>

        <form id="uploadFolderForm" enctype="multipart/form-data">
            <label for="folder">Upload Folder:</label>
            <input type="file" name="folder" webkitdirectory directory multiple>
            <button type="submit">Upload Folder and Convert</button>
        </form>

        <progress id="progressBar" value="0" max="100"></progress>
        <div id="status"></div>

        <div class="cpu-usage">
            <span>CPU Usage:</span> <span id="cpuUsage">0%</span>
        </div>

        <button id="cancelButton">Cancel Conversion</button>

        <div class="video-list" id="videoList">
            <!-- Converted videos will be listed here -->
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

##### 2. `script.js` (前端脚本)

放在 `public/` 文件夹中，这是前端 JavaScript 脚本。

```javascript
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/upload', true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            document.getElementById('progressBar').value = percentComplete;
            document.getElementById('status').textContent = `Uploading: ${Math.round(percentComplete)}%`;
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            document.getElementById('status').textContent = 'Upload and conversion complete.';
            loadVideos();
        } else {
            document.getElementById('status').textContent = 'Error during upload or conversion.';
        }
    };

    xhr.send(formData);
});

document.getElementById('uploadFolderForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/upload-folder', true);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            document.getElementById('progressBar').value = percentComplete;
            document.getElementById('status').textContent = `Uploading: ${Math.round(percentComplete)}%`;
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            document.getElementById('status').textContent = 'Folder upload and conversion complete.';
            loadVideos();
        } else {
            document.getElementById('status').textContent = 'Error during folder upload or conversion.';
        }
    };

    xhr.send(formData);
});

document.getElementById('cancelButton').addEventListener('click', function() {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/cancel', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            document.getElementById('status').textContent = 'Conversion cancelled.';
        } else {
            document.getElementById('status').textContent = 'Error cancelling conversion.';
        }
    };
    xhr.send();
});

function loadVideos() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/videos', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            const videos = JSON.parse(xhr.responseText);
            const videoList = document.getElementById('videoList');
            videoList.innerHTML = '';
            videos.forEach(video => {
                const link = document.createElement('a');
                link.href = `/download/${video.name}`;
                link.textContent = video.name;
                videoList.appendChild(link);
            });
        }
    };
    xhr.send();
}

function updateCpuUsage() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/cpu-usage', true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            document.getElementById('cpuUsage').textContent = `${data.cpuUsage}%`;
        }
    };
    xhr.send();
}

setInterval(updateCpuUsage, 5000);

window.onload = loadVideos;
```

##### 3. `index.js` (后端文件)

这是主要的后端逻辑文件，处理上传、FFmpeg转换、文件管理和日志记录功能。

```JavaScript
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
```

##### 4. `.gitignore` (忽略文件)

在项目根目录下创建一个 `.gitignore` 文件，避免上传一些不必要的文件。

```
node_modules/
uploads/
outputs/
```

##### 5. 安装依赖并启动服务器

1. 确保安装所需的 npm 包：

   ```
   npm install express multer winston node-cron
   ```

2. 运行服务器：

   ```
   node index.js
   ```



##### 6. 访问和测试

服务器启动后，访问 `http://localhost:3000`，你应该可以看到上传界面，并通过该界面上传视频、选择转换选项，查看上传进度，并下载转换后的视频。



### 第三阶段：使用 Docker 容器化应用

在 Docker 上运行你的 FFmpeg Web UI 项目需要创建一个 Docker 镜像，然后在容器中运行这个镜像。以下是详细步骤：

##### 1. 创建 `Dockerfile`

在项目的根目录下创建一个 `Dockerfile`文件，它定义了如何构建 Docker 镜像。

```
# 使用官方的 Node.js 作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件到容器内
COPY . .

# 安装 FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# 开放端口
EXPOSE 3000

# 运行应用
CMD ["node", "index.js"]
```

##### 2. 创建 `.dockerignore`

在项目根目录下创建 `.dockerignore` 文件，以防止不必要的文件被复制到 Docker 镜像中。

```
node_modules
logs
uploads
outputs
npm-debug.log
Dockerfile
.dockerignore
.git
```

##### 3. 构建 Docker 镜像

在终端中，导航到项目的根目录，然后执行以下命令来构建 Docker 镜像。

```
docker build -t ffmpeg-webui .
```

这里的 `-t ffmpeg-webui` 是给镜像指定了一个标签（tag），可以用来标识镜像。

##### 4. 运行 Docker 容器

(记得在运行前先将本地的程序关闭)

**常规方式**

使用以下命令运行刚刚创建的 Docker 容器：

```
docker run -d -p 3000:3000 --name ffmpeg-webui-container ffmpeg-webui
```

- `-d` 表示后台运行容器（detached mode）。
- `-p 3000:3000` 将主机的 3000 端口映射到容器的 3000 端口。
- `--name ffmpeg-webui-container` 给容器命名为 `ffmpeg-webui-container`。
- `ffmpeg-webui` 是你在构建镜像时指定的标签。

**实现开机自启动和持久化存储**

```bash
docker run -d \
    -v /path/to/your/folder:/app/outputs \		# 会将文件同步到主机环境
    -p 3000:3000 \
    --name ffmpeg-webui-container \
    --restart unless-stopped \					# 开机自启动
    ffmpeg-webui
```

在这里，`--restart unless-stopped` 选项表示：

- **`always`**：无论容器退出状态如何，总是自动重启容器。
- **`unless-stopped`**：容器将在 Docker 服务启动时自动启动，除非容器在上次被手动停止。
- **`on-failure`**：仅在容器退出状态码非零时自动重启容器。
- **`no`**：默认值，不自动重启容器。



##### 5. 访问你的应用

容器启动后，你可以在浏览器中访问 `http://localhost:3000` 来查看和使用你的 FFmpeg Web UI 应用。

##### 6. 容器管理

- **查看运行中的容器**：

  ```
  docker ps
  ```

- **停止容器**：

  ```
  docker stop ffmpeg-webui-container
  ```

- **启动已停止的容器**：

  ```
  docker start ffmpeg-webui-container
  ```

- **删除容器**：

  ```
  docker rm ffmpeg-webui-container
  ```

- **删除镜像**：

  ```
  docker rmi ffmpeg-webui
  ```

- **容器内部保存路径**

  这些路径是在容器内部的文件系统中的相对路径。容器内部的文件系统与主机文件系统是隔离的。

  要查看容器内部的文件，可以进入容器并查看这些目录：

  ```
  docker exec -it ffmpeg-webui-container /bin/bash
  cd uploads/   # 查看上传的视频文件
  ls
  cd ../outputs/   # 查看转码后的视频文件
  ls
  ```

  

##### 7. Docker Compose (可选)

如果你的项目将来需要多个服务（比如前端、后端、数据库等），你可以考虑使用 Docker Compose 来管理多个容器。以下是一个简单的 `docker-compose.yml` 示例：

```yaml
version: '3'
services:
  web:
    build: .
    ports:
      - "3000:3000"
```

### 总结

通过上述步骤，你已经将 FFmpeg Web UI 应用成功 Docker 化，并可以在任何支持 Docker 的环境中运行你的项目。