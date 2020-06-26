const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');



const app = express();

//View Engine
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(methodOverride('_method'));


//Mongo URI
const mongoURI = 'mongodb://Samy:123@ds263948.mlab.com:63948/mongoupload';

//Create mongo connection
const conn = mongoose.createConnection(mongoURI);

//Init gfs
let gfs;

conn.once('open', () => {
  //Initialize Stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

//Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({ storage });


//--------------------------------ROUTES----------------------------------------

//@routes GET /
//@desc Loads Form
app.get('/', (req, res) => {
  gfs.files.find().toArray( (err, files) => {
    //Check if files exits
    if(!files || files.length === 0){
      res.render('index', {files: false});
    }else{
      files.map( file => {
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
          file.isImage = true;
        }else{
          file.isImage = false;
        }
      });
      res.render('index', {files: files});
    }

  });
});

//@routes POST /upload
//@desc Uploads file to DB - Use the 'upload' variable middleware ('single' method takes the input value)
app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({file: req.file});
  res.redirect('/');
});

//@routes GET /
//@desc Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray( (err, files) => {
    //Check if files exits
    if(!files || files.length === 0){
      res.status(404).json({
        err: 'No files exists'
      });
    }

    //Files exists
    return res.json(files);
  });
});


//@routes GET /files/:filename
//@desc Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        //Check if file exits
        if(!file || file.length === 0){
          res.status(404).json({
            err: 'No file exists'
          });
        }

        //File exits
        return res.json(file);
  });
});


//@routes GET /image/:filename
//@desc Display image in JSON
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        //Check if file exits
        if(!file || file.length === 0){
          res.status(404).json({
            err: 'No file exists'
          });
        }

        //Check it is an image
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
              //Read output to browser
              const readstream = gfs.createReadStream(file.filename);
              readstream.pipe(res);
        }else{
          res.status(404).json({err: 'Not an image'});
        }
  });
});

// @route DELETE /files/:id
// @desc Delete file

app.delete('/files/:id', (req, res) => {
  gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore) => {
    if(err){
      return res.status(404).json({err: err});
    }
    res.redirect('/');
  });

});



//------------------------------------------------------------------------------


const port = 5000;


app.listen(port, () => console.log(`Server started on port ${port}`));