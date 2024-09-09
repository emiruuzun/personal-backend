const mongoose = require("mongoose");
const winston = require('winston');

// Winston için bir logger örneği oluştur
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'mongoose-debug.log', // Logların yazılacağı dosya
      level: 'info' // Kaydedilecek log seviyesi
    })
  ]
});

// Mongoose debug çıktılarını winston ile dosyaya yaz
mongoose.set('debug', function (collectionName, method, query, doc) {
  // Log mesajını oluştur
  const message = `${collectionName}.${method} ${JSON.stringify(query)} ${doc ? JSON.stringify(doc) : ''}`;

  // Winston ile logla
  logger.info(message);
});

const connectDatabase = () =>{

    mongoose.connect(process.env.MONGO_URI,{
      
    }).then((data)=>{
        console.log(`Mongodb connected with server: ${data.connection.host}`);
    })
    .catch((err)=>{
        console.error(err);
    });
};

module.exports = connectDatabase;