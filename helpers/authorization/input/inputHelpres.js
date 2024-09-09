const brypt = require("bcryptjs")

const validateUserInput = (email, password)=>{

    return email && password;

};

const comparePassword = (password, hashPassword)=>{

    return brypt.compareSync(password,hashPassword)

}

module.exports = {
    validateUserInput,
    comparePassword
}