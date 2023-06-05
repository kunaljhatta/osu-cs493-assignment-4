const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { connectToRabbitMQ, getChannel } = require('../lib/rabbitmq');
const { getPhotoDownloadStreamById, saveThumbFile, removeUploadedFile, addThumbIdToPhoto } = require("../models/photo");

async function run() {
  try {
    await connectToRabbitMQ("photos");
    const channel = getChannel();
    channel.consume("photos", async (msg) => {
      if (msg) {
        const id = msg.content.toString();
        const downloadStream = getPhotoDownloadStreamById(id);

        const filePath = path.join(__dirname, '..', 'uploads', id);
        const resizedFilePath = path.join(__dirname, '..', 'uploads', `${id}_resized`);

        const writeStream = fs.createWriteStream(filePath);
        downloadStream.pipe(writeStream);

        downloadStream.on('end', async () => {
          try {
            await sharp(filePath).resize(100, 100).toFile(resizedFilePath);
            const thumb = {
              filename: id,
              path: resizedFilePath,
            };
            const thumbId = await saveThumbFile(thumb);
            await removeUploadedFile(filePath);
            await removeUploadedFile(resizedFilePath);
            await addThumbIdToPhoto(id, thumbId);
          } catch (error) {
            console.error('Error processing photo:', error);
          }
        });
      }
      channel.ack(msg);
    });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
  }
}

exports.run = run;
