const fs = require('fs');

function checkDir(dir) {
  if (fs.existsSync(dir)) {
    console.log(`Directory ${dir} exists. Contents:`, fs.readdirSync(dir));
  } else {
    console.log(`Directory ${dir} does not exist.`);
  }
}

checkDir('messages');
checkDir('src/messages');
checkDir('src/i18n');
checkDir('i18n');
