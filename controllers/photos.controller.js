const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const requestIp = require('request-ip');


/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;
    if (title && author && email && file) { // if fields are not empty...
      const authorPattern = new RegExp(/(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/, 'g');
      const titlePattern = new RegExp(/(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/, 'g');
      const emailPattern = new RegExp(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,'g');
      if (!authorPattern.test(author)) {
        throw new Error('Invalid author');
      }
      if (!emailPattern.test(email)) {
        throw new Error('Invalid email');
      }
      if (!titlePattern.test(title)) {
        throw new Error('Invalid title');
      }
      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
      const fileExt = fileName.split('.').slice(-1)[0];
      console.log('fileExt', fileExt)
      if ((fileExt === 'jpg' || 'png' || 'gif') && title.length <= 25 && author.length <= 50) {
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('Wrong file!');
      }
    } else {
      throw new Error('Wrong input!');
    }
  } catch(err) {
    res.status(500).json(err);
  }
};
/****** LOAD ALL PHOTOS ********/
exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }
};
/****** VOTE FOR PHOTO ********/
exports.vote = async (req, res) => {

  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    const userIp = requestIp.getClientIp(req);
    const findUser = await Voter.findOne({ user: userIp });

    if (findUser) {
      const checkVote = findUser.votes.includes(photoToUpdate._id);
      if (checkVote) {
        res.status(500).json({message: 'You already voted.'})
      } else if (!checkVote) {
        await Voter.findOneAndUpdate(
          { user: userIp },
          { $push: { votes: photoToUpdate._id } },
          () => {
            photoToUpdate.votes++;
            photoToUpdate.save();
            res.send({ message: 'OK' });
          }
        );
      }
    } else if (!findUser) {
      const newVoter = new Voter({
        user: userIp,
        $push: { votes: photoToUpdate._id },
      });
      await newVoter.save();
    }
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
  } catch (err) {
    res.status(500).json(err);
  }
};