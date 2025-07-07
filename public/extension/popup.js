document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('startRecording');
    const statusDiv = document.getElementById('status');
    let mediaRecorder;
    let stream;
    let chunks = [];
    let isRecording = false;
    let recordedVideoUrl;
    let thumbnailUrl;

    const createThumbnail = async (videoUrl) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.onloadedmetadata = () => {
                video.currentTime = 0.1;
                video.onseeked = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    canvas.toBlob((blob) => {
                        resolve(URL.createObjectURL(blob));
                    }, 'image/jpeg', 0.8);
                };
            };
            video.onerror = reject;
        });
    };

    const uploadVideo = async (videoBlob, thumbnailUrl) => {
        try {
            // Get upload URLs
            const videoUploadResponse = await fetch('http://localhost:3000/api/videos/upload-url', {
                method: 'GET',
                credentials: 'include'
            });

            if (!videoUploadResponse.ok) {
                throw new Error('Failed to get upload URL');
            }

            const { videoId, uploadUrl } = await videoUploadResponse.json();

            // Upload video
            await fetch(uploadUrl, {
                method: 'PUT',
                body: videoBlob
            });

            // Get thumbnail upload URL
            const thumbnailUploadResponse = await fetch('http://localhost:3000/api/thumbnails/upload-url', {
                method: 'GET',
                credentials: 'include'
            });

            if (!thumbnailUploadResponse.ok) {
                throw new Error('Failed to get thumbnail upload URL');
            }

            const { uploadUrl: thumbnailUploadUrl } = await thumbnailUploadResponse.json();

            // Upload thumbnail
            const thumbnailResponse = await fetch(thumbnailUrl);
            const thumbnailBlob = await thumbnailResponse.blob();
            await fetch(thumbnailUploadUrl, {
                method: 'PUT',
                body: thumbnailBlob
            });

            // Save video details
            const saveResponse = await fetch('http://localhost:3000/api/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    videoId,
                    thumbnailUrl,
                    title: `Snappit - ${new Date().toLocaleString()}`,
                    description: 'Recorded with Snappit extension'
                }),
                credentials: 'include'
            });

            if (!saveResponse.ok) {
                throw new Error('Failed to save video details');
            }

            return await saveResponse.json();
        } catch (error) {
            throw error;
        }
    };

    startButton.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                startButton.disabled = true;
                statusDiv.textContent = 'Starting recording...';

                // Get display media
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: "always"
                    },
                    audio: true
                });

                // Create MediaRecorder
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9'
                });

                mediaRecorder.ondataavailable = (event) => {
                    chunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const videoBlob = new Blob(chunks, { type: 'video/webm' });
                    chunks.length = 0;

                    // Create thumbnail
                    recordedVideoUrl = URL.createObjectURL(videoBlob);
                    thumbnailUrl = await createThumbnail(recordedVideoUrl);

                    // Upload video and thumbnail
                    try {
                        const uploadResult = await uploadVideo(videoBlob, thumbnailUrl);
                        statusDiv.textContent = 'Recording saved successfully!';
                        startButton.textContent = 'Start Recording';
                        startButton.disabled = false;
                        
                        // Store recorded video info in session storage
                        sessionStorage.setItem('recordedVideo', JSON.stringify({
                            url: recordedVideoUrl,
                            name: 'recording.webm',
                            type: 'video/webm',
                            duration: videoBlob.duration,
                            thumbnailUrl
                        }));

                        // Redirect to upload page
                        window.open('http://localhost:3000/upload', '_blank');
                    } catch (error) {
                        statusDiv.textContent = 'Error saving recording: ' + error.message;
                        startButton.textContent = 'Start Recording';
                        startButton.disabled = false;
                    }
                };

                mediaRecorder.start();
                statusDiv.textContent = 'Recording in progress...';
                startButton.textContent = 'Stop Recording';
                isRecording = true;
                startButton.disabled = false;
            } catch (error) {
                statusDiv.textContent = 'Error starting recording: ' + error.message;
                startButton.textContent = 'Start Recording';
                startButton.disabled = false;
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
        }
    });

    // Cleanup on unload
    window.addEventListener('unload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
        }
        if (thumbnailUrl) {
            URL.revokeObjectURL(thumbnailUrl);
        }
    });
});
