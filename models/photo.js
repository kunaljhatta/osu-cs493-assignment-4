/*
 * Photo schema and data accessor methods.
 */

const { ObjectId, GridFSBucket } = require('mongodb')
const fs = require("fs")
const sharp = require('sharp');
const { getDbReference } = require('../lib/mongo')
const { extractValidFields } = require('../lib/validation')

/*
 * Schema describing required/optional fields of a photo object.
 */
const PhotoSchema = {
  userId: { required: true },
  businessId: { required: true },
  caption: { required: false }
}
exports.PhotoSchema = PhotoSchema

async function insertNewPhoto(photo) {
  photo = extractValidFields(photo, PhotoSchema)
  photo.businessId = ObjectId(photo.businessId)
  const db = getDbReference()
  const collection = db.collection('photos')
  const result = await collection.insertOne(photo)
  return result.insertedId
}
exports.insertNewPhoto = insertNewPhoto

exports.savePhotoInfo = async function (photo) {
  const db = getDBReference();
  const collection = db.collection('photos');
  const result = await collection.insertOne(photo);
  return result.insertedId;
};

async function savePhotoFile(photo) {
  return new Promise(function (resolve, reject) {
      const db = getDbReference()
      const bucket = new GridFSBucket(db, { bucketName: "photos" })
      const metadata = {
          contentType: photo.contentType,
          userId: photo.userId
      }
      const uploadStream = bucket.openUploadStream(
          photo.filename,
          { metadata: metadata }
      )
      fs.createReadStream(photo.path).pipe(uploadStream)
          .on("error", function (err) {
              reject(err)
          })
          .on("finish", function (result) {
              console.log("== write success, result:", result)
              resolve(result._id)
          })
  })
} 
exports.savePhotoFile = savePhotoFile

function removeUploadedFile(file) {
  return new Promise((resolve, reject) => {
    fs.unlink(file.path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
exports.removeUploadedFile = removeUploadedFile

async function getPhotoInfoById(id) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'photos' });  
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}
exports.getPhotoInfoById = getPhotoInfoById

function getPhotoDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: "photos" })
  if (!ObjectId.isValid(id)) {
    return null
  } else {
    return bucket.openDownloadStream(new ObjectId(id))
  }
}
exports.getPhotoDownloadStreamById = getPhotoDownloadStreamById

/*
 * Executes a DB query to fetch a single specified photo based on its ID.
 * Returns a Promise that resolves to an object containing the requested
 * photo.  If no photo with the specified ID exists, the returned Promise
 * will resolve to null.
 */
async function getPhotoById(id) {
  const db = getDbReference()
  const collection = db.collection('photos.files')
  if (!ObjectId.isValid(id)) {
    return null
  } else {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray()
    return results[0]
  }
}
exports.getPhotoById = getPhotoById

function getDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'photos' })
  if (!ObjectId.isValid(id)) {
      return null
  } else {
      return bucket.openDownloadStream(new ObjectId(id))
  }
}
exports.getDownloadStreamById = getDownloadStreamById

function getThumbDownloadStreamById(id) {
  const db = getDbReference()
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs'})
  return bucket.openDownloadStream(new ObjectId(id))
}
exports.getThumbDownloadStreamById = getThumbDownloadStreamById

async function saveThumbFile(thumb) {
  return new Promise(function (resolve, reject) {
      const db = getDbReference()
      const bucket = new GridFSBucket(db, { bucketName: "thumbs" })
      const metadata = {
          contentType: "image/jpeg",
      }
      const uploadStream = bucket.openUploadStream(
          thumb.filename,
          { metadata: metadata }
      )
      fs.createReadStream(thumb.path).pipe(uploadStream)
          .on("error", function (err) {
              reject(err)
          })
          .on("finish", function (result) {
              resolve(result._id)
          })
  })
} 
exports.saveThumbFile = saveThumbFile

async function updatePhotoSizeById(id, dimensions) {
  const db = getDbReference()
  const collection = db.collection('photos.files')
  if (!ObjectId.isValid(id)) {
      return null
  } else {
      const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { "metadata.dimensions": dimensions }}
      )
      return result.matchedCount > 0
  }
}
exports.updatePhotoSizeById = updatePhotoSizeById


async function createThumbnail(id, photoData) {
  const thumb = sharp(photoData).resize(100,100)
  const db = getDbReference()
  const photo = await getPhotoDownloadStreamByFilename(id)
  await saveThumbFile(thumb)
}
exports.createThumbnail = createThumbnail

async function addThumbIdToPhoto(id, thumbId) {
  const db = getDbReference()
  const collection = db.collection('photos.files')
  if (!ObjectId.isValid(id)) {
      return null 
  } else {
      const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { "metadata.thumbId": ObjectId(thumbId) }}
      )
      return result.matchedCount > 0
  }
}
exports.addThumbIdToPhoto = addThumbIdToPhoto

async function getThumbInfoById(id) {
  const db = getDbReference();
  const bucket = new GridFSBucket(db, { bucketName: 'thumbs' });  
  if (!ObjectId.isValid(id)) {
    return null;
  } else {
    const results = await bucket.find({ _id: new ObjectId(id) }).toArray();
    return results[0];
  }
}
exports.getThumbInfoById = getThumbInfoById

