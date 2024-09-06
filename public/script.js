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

