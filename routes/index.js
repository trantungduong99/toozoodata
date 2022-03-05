const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Metadata = require('../models/metadata');
const Web3 = require('web3');
const ethUtil = require('ethereumjs-util');
const sharp = require('sharp');

// @ts-ignore
//const sdk = require('api')('@opensea/v1.0#1j3wv35kyd6wqwc'); 
const https = require('https');

const contractAddress = '0xd2e52e588eb0cab69ca3289d60bde66406e238af';

const urlAvatar = "https://toozoodata.herokuapp.com/avatar/";
//const EtherUtil = require('ethereumjs-util');

let listAttributeRemove = ["id","num_sales","background_color","image_url","image_preview_url","image_thumbnail_url","image_original_url","animation_url","animation_original_url",
"external_link","asset_contract","permalink","collection","owner","creator","decimals","token_metadata","sell_orders","last_sale","top_bid","listing_date","is_presale","transfer_fee_payment_token","transfer_fee"];
let listTraitsAttributeRemove = ["display_type","max_value","trait_count","order"];
let valueAttribute = {
	"water": 0,
	"fire": 1,
	"wind": 2,
	"earth": 3,
	"lighing": 4,
	"male": 1,
	"female": 0
};

let part = {
	"base" : 0,   // change to body
	"head" : 1,
	"back" : 2,
	"legs" : 3,
	"tail" : 4
}

let partById = {
	0 : "base",   // change to body
	1 : "head",
	2 : "back",
	3 : "legs",
	4 : "tail"
}

let attributeId = {
	0: "water",
	1: "fire",
	2: "wind",
	3: "earth",
	4: "lighing"
}

router.get('/register', (req, res, next) => {
	return res.render('index.ejs');
});

let cacheFather = undefined;
let cacheMother = undefined;

router.post('/register', (req, res, next) => {
	let personInfo = req.body;

	if (!personInfo.username || !personInfo.password || !personInfo.publicAddress) {
		res.send({ "Success": "Please fill full form." });
	} else {
		User.findOne({ username: personInfo.username }, (err, data) => {
			if (!data) {
				let c;
				User.findOne({}, (err, data) => {

					if (data) {
						c = data.unique_id + 1;
					} else {
						c = 1;
					}
					var randomNonce = Math.floor(Math.random() * 1000000);
					let newPerson = new User({
						unique_id: c,
						username: personInfo.username,
						password: personInfo.password,
						publicAddress: personInfo.publicAddress,
						nonce: randomNonce,
						isSigned: false
					});

					newPerson.save((err, Person) => {
						if (err)
							console.log(err);
						else
							console.log('Success');
					});

				}).sort({ _id: -1 }).limit(1);
				console.log("Success");
				res.send({ "Success": "You are regestered,You can login now." });
			} else {
				console.log("Account already exits");
				res.send({ "Success": "Account name already used." });
			}

		});
	}
});

router.get('/login', (req, res, next) => {
	return res.render('login.ejs');
});

router.post('/login', (req, res, next) => {
	User.findOne({ username: req.body.username }, (err, data) => {
		if (data) {

			if (data.password == req.body.password) {
				req.session.userId = data.unique_id;
				res.send({ "Success": "Success!" });
			} else {
				res.send({ "Success": "Wrong password!" });
			}
		} else {
			res.send({ "Success": " Account Is not regestered!" });
		}
	});
});

router.get('/profile', (req, res, next) => {
	User.findOne({ unique_id: req.session.userId }, (err, data) => {
		if (!data) {
			res.redirect('/register');
		} else {
			console.log(JSON.stringify(Web3));

			var web3;

			

			//console.log(browserPublicAddress);

			data = { "username": data.username, "publicAddress": data.publicAddress, "isSigned": data.isSigned , "nonce": data.nonce, "web3": Web3};
			return res.render('data.ejs', data);
		}
	});
});

router.get('/', (req, res, next) => {
	res.send('Get ready for OpenSea!');
});

//app.use(express.static(path.join(__dirname, 'public')))

router.get('/api/token/:token_id', (req, res, next) => {
	const tokenId = parseInt(req.params.token_id);
	Metadata.findOne({ id: tokenId }, (err, data) => {
		if (!data) {
			const tokenId = parseInt(req.params.token_id).toString();
			const tooZoo = db[tokenId];
			res.send(tooZoo);
		} else {
			res.send(data);
			// data = { "username": data.username, "publicAddress": data.publicAddress, "isSigned": data.isSigned , "nonce": data.nonce, "web3": Web3};
			// return res.render('data.ejs', data);
		}
	});
	//const tokenId = parseInt(req.params.token_id).toString()
});

router.post('/authNonce', (req, res, next) => {
	console.log(' Authhh Nonceeeeeeee', JSON.stringify(req.body));

		User.findOne({ publicAddress: req.body.publicAddress }, (err, data) => {
		if (data) {
			if (data.isSigned)
			{
				console.log("Account address already signed!");
				return res.send({"Success": "Account address already signed!"});
			}

			var message = `I am signing my one-time nonce: ${data.nonce}`;
			const msg = new Buffer.from(message);
			//const hexMessage = '0x' + Buffer.from(message,16);
			console.log("hexMessage",msg);
			//const saa = Web3.sha3(message);
			//const hexString = new Buffer(message,'hex');
			// const msgBuffer = ethUtil.toBuffer(prefixedMsg);
			// console.log("msgBuffer",JSON.stringify(msgBuffer));

			const signatureBuffer = ethUtil.toBuffer(req.body.signature);
			console.log("signatureBuffer",JSON.stringify(signatureBuffer));
			const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
			console.log("signatureParams",JSON.stringify(signatureParams));

			const msgHash = ethUtil.hashPersonalMessage(msg);
			console.log("msgHash",JSON.stringify(msgHash));

			const publicKey = ethUtil.ecrecover(
			msgHash,
			signatureParams.v,
			signatureParams.r,
			signatureParams.s
			);
			const addressBuffer = ethUtil.publicToAddress(publicKey);
			console.log("addressBuffer",JSON.stringify(addressBuffer));
			const address = ethUtil.bufferToHex(addressBuffer);
			console.log("address",JSON.stringify(address));
			
			// The signature verification is successful if the address found with
			// ecrecover matches the initial publicAddress
			console.log(address,data.publicAddress);
			if (address.toString() == data.publicAddress.toLowerCase()) {
				data.isSigned = true;
				data.save((err, Person) => {
					if (err)
						console.log(err);
					else
						console.log('Success');
				});
				console.log(address,data.publicAddress);
				return res.send({ "Success": "Success!" });
			} 
			else {
				return res.send({ "Success": "Sign fail" });
			}

			// if (data.password == req.body.password) {
			// 	req.session.userId = data.unique_id;
			// 	res.send({ "Success": "Success!" });
			// } else {
			// 	res.send({ "Success": "Wrong password!" });
			// }
		} else {
			res.send({ "Success": " Public Address not is not regestered!" });
		}
	});
});

router.post('/requestBreed', (req, res, next) => {
	console.log("???");
	console.log("requestBreed");
	let fatherId = req.body.fatherId;
	let motherId = req.body.motherId;
	console.log(fatherId, motherId);

	// let url = 'https://testnets-api.opensea.io/api/v1/asset/'+ '0xd2e52e588eb0cab69ca3289d60bde66406e238af/' + fatherId.toString();
	// https.get(url,(responeData) => {
	// 	let body = "";
	// 	responeData.on("data", (chunk) => {
	// 	body += chunk;
	// 	});
	// 	responeData.on("end", () => {
	// 	try {
	// 		let json = JSON.parse(body);
	// 		// do something with JSON
	// 		console.log("Father Data: ");
	// 		console.log(json);
	// 		if (json.success == false)
	// 		{
	// 			res.send({errorCode: 2, message: "Invalid Id"});
	// 		}
	// 		else
	// 		{
	// 			let urlmt = 'https://testnets-api.opensea.io/api/v1/asset/'+ '0xd2e52e588eb0cab69ca3289d60bde66406e238af/' + motherId.toString();
	// 			https.get(urlmt,(responeDataMt) => {
	// 				let bodymt = "";
	// 				responeDataMt.on("data", (chunk) => {
	// 				bodymt += chunk;
	// 				});
	// 				responeDataMt.on("end", () => {
	// 				try {
	// 					let jsonmt = JSON.parse(bodymt);
	// 					// do something with JSON
	// 					console.log("Mother Data: ");
	// 					console.log(jsonmt);
	// 					if (jsonmt.success == false)
	// 					{
	// 						res.send({errorCode: 2, message: "Invalid Id"});
	// 					}
	// 					else
	// 					{
	// 						if (json.owner.address != jsonmt.owner.address)
	// 						{
	// 							res.send({errorCode: 3, message: "You not have ownership to both token"});
	// 						}
	// 						else
	// 						{
	// 							if (json.traits[5].value == jsonmt.traits[5].value)
	// 							{
	// 								res.send({errorCode: 1, message: "Invalid gender"});
	// 							}
	// 							else
	// 							{
	// 								console.log("OKE RROOIFOIOF");
	// 								res.send({ errorCode : 0, message: "OK, let's Breed"});
	// 								Metadata.find({ id: {"$in" : 
	// 									[({fatherId}), 
	// 									({motherId})
	// 									]
	// 								}})
	// 								.then(function(data)
	// 								{
	// 									console.log("Metadata: ");
	// 									console.log(data);
	// 								});
	// 							}
	// 						}
	// 					}
	// 				} catch (errormt) {
	// 					console.error(errormt.message);
	// 				};
	// 				});

	// 			}).on("error", (errormt) => {
	// 				console.error(errormt.message);
	// 			});
	// 		}
	// 	} catch (error) {
	// 		console.error(error.message);
	// 	};
	// 	});

	// }).on("error", (error) => {
	// 	console.error(error.message);
	// });
	
	// sdk['retrieving-a-single-asset-testnets']({
	// asset_contract_address: contractAddress,
	// token_id: fatherId.toString()
	// })
	// .then(function(res){
	// 	console.log("Owner: ");
	// 	console.log(res.owner.address);
	// 	console.log("Gender: ");
	// 	console.log(res.traits[5].value);
	// 	sdk['retrieving-a-single-asset-testnets']({
	// 		asset_contract_address: contractAddress,
	// 		token_id: motherId.toString()
	// 		})
	// 		.then(function(resMt){
	// 			console.log("Owner: ");
	// 			console.log(resMt.owner.address);
	// 			console.log("Gender: ");
	// 			console.log(resMt.traits[5].value);

	// 			if (res.owner.address == resMt.owner.address)
	// 			{
	// 				// same owner
	// 				if (res.traits[5].value != resMt.traits[5].value)
	// 				{
	// 					// gender ok
	// 					console.log("OK ROIF");
	//  					//res.send({ errorCode : 0, message: "OK, let's Breed"});					
	// 				}
	// 				else
	// 				{
	// 					res.send({ errorCode : 1, message: "Invalid gender"});
	// 				}
	// 			}
	// 			else
	// 			{
	// 				res.send({errorCode: 3, message: "You not have ownership to both token"});
	// 			}
	// 		})
	// 		.catch(errMt => {console.error(errMt);res.send({errorCode: 2, message: "Invalid Id"});});
	// })
	// .catch(err => {console.error(err),res.send({errorCode: 2, message: "Invalid Id"});});

	Metadata.findOne({ id: fatherId }, (err, data) => {
		if (data) {			
			if (data.attributes[5].value == "female")
			{
				res.send({ errorCode : 1, message: "Invalid gender"});
			}
			else
			{
				Metadata.findOne({ id: motherId }, (err, dataMother) => {
					if (dataMother) {
						if (dataMother.attributes[5].value == "male")
						{
							res.send({ errorCode : 1, message: "Invalid gender"});
						}
						else
						{
							res.send({ errorCode : 0, message: "OK, let's Breed"});
						}
					} else {
						res.send({errorCode: 2, message: "Invalid Id"});
					}
				});
			}
		} else {
			res.send({errorCode: 2, message: "Invalid Id"});
		}
	});
});

router.post('/breedNewToken', (req, res, next) => {
	console.log(' Breed New ToKennnnnnnnn', JSON.stringify(req.body));
	let newTokenId = req.body.tokenIdx;
	let fatherId = req.body.fatherIdx;
	let motherId = req.body.motherIdx;
	Metadata.findOne({ id: fatherId }, (err, data) => {
		if (data) {			
			Metadata.findOne({ id: motherId }, (err, dataMother) => {
				if (dataMother) {
					arrayTraits = [];
					let urlImg = urlAvatar;
					let randomGen = [];
					let sum = 0;
					while (sum == 0 || sum == 5)
					{
						sum = 0;
						for (let i = 0; i < 5; i++)
						{
							randomGen.push(Math.floor(Math.random() * 2));
							sum+= randomGen[i];
						}
					}
					
					for (let i = 0; i < 5; i++)
					{
						let attributeValue = (randomGen[i] == 0)?dataMother.attributes[i].value:data.attributes[i].value;
						urlImg+= valueAttribute[attributeValue];
						let attribute = {
							trait_type: partById[i],
							value: attributeValue
						}
						arrayTraits.push(attribute);
					}
					let gender = Math.floor(Math.random()*2);
					let tempGender = (gender == 1)?"male":"female";
					urlImg+= gender;
					arrayTraits.push({
						trait_type: "gender",
						value: tempGender
					});
					arrayTraits.push({
						trait_type: "personality",
						value: fatherId + "_S2_" + motherId
					});
					let newToken = new Metadata({
						id: newTokenId,  //new token id
						attributes: arrayTraits,
						description: "New TooZoo token id: " + newTokenId + "\n **Child of:** " + fatherId.toString() + " and " + motherId.toString(),
						image: urlImg,
						name: "TooZoo #"+newTokenId
					});
					newToken.save((err, token) => {
						if (err)
						{
							console.log(err);
							res.send({ errorCode : 1, message: "Error in save item database"});
						}
						else
						{
							console.log('Success roi:', newTokenId);
							console.log(JSON.stringify(newToken));
							res.send({ errorCode : 0, message: "Da mint 1 item moi", newTokenData : newToken});
						}
					});
				}
			});
		}
	});
});


router.post('/mintNewToken', (req, res, next) => {
	console.log(' Mint New ToKennnnnnnnn', JSON.stringify(req.body));
		let newTokenId = req.body.tokenId;
		Metadata.findOne({ id: newTokenId }, (err, data) => {
		if (data) {
			res.send({ errorCode : 0, message: "Da mint item co san"});
		} else {
			arrayTraits = [];
			let urlImg = urlAvatar;
			for (let i = 0; i < 5; i++)
			{
				let attributeIndex = Math.floor(Math.random() * 5);
				urlImg+=attributeIndex;
				let attributePart = attributeId[attributeIndex]
				let attribute = {
					trait_type: partById[i],
					value: attributePart
				}
				arrayTraits.push(attribute);
			}
			let randomGender = Math.floor(Math.random()*2);
			let tempGender = (randomGender == 1)?"male":"female";
			urlImg+=randomGender;
			arrayTraits.push({
				trait_type: "gender",
				value: tempGender
			});
			arrayTraits.push({
				trait_type: "personality",
				value: "Normal"
			});

			let newToken = new Metadata({
				id: newTokenId,  //new token id
				attributes: arrayTraits,
				description: "New TooZoo token id: " + newTokenId,
				image: urlImg,
				name: "TooZoo #"+newTokenId
			});
			newToken.save((err, token) => {
				if (err)
				{
					console.log(err);
					res.send({ errorCode : 1, message: "Error in save item database"});
				}
				else
				{
					console.log('Success roi:', newTokenId);
					console.log(JSON.stringify(newToken));
					res.send({ errorCode : 0, message: "Da mint 1 item moi", newTokenData : newToken});
				}
			});
		}
	});
});


router.get('/getTroopData', (req, res, next) => {
	console.log(JSON.stringify(req.query.publicAddress)," get troop data");

	let url = 'https://testnets-api.opensea.io/api/v1/assets?owner=' + req.query.publicAddress + '&asset_contract_address=' + contractAddress + '&order_direction=desc&offset=0&limit=20';

	// https.get(url,(responeData) => {
	// 	let body = "";

	// 	responeData.on("data", (chunk) => {
	// 	  body += chunk;
	// 	});

	// 	responeData.on("end", () => {
	// 	  try {
	// 		let json = JSON.parse(body);
	// 		for (let a in json["assets"])
	// 		{
	// 			for (let i = 0; i < listAttributeRemove.length; i++)
	// 			{
	// 				delete json["assets"][a][listAttributeRemove[i]];
	// 			}
	// 			for (let i in json["assets"][a]["traits"])
	// 			{
	// 				for (let j = 0; j < listTraitsAttributeRemove.length; j++)
	// 				{
	// 					delete json["assets"][a]["traits"][i][listTraitsAttributeRemove[j]];
	// 				}
	// 				let key = json["assets"][a]["traits"][i]["trait_type"];
	// 				let value = valueAttribute[json["assets"][a]["traits"][i]["value"]];
	// 				json["assets"][a]["traits"][i][key] = value;
	// 				delete json["assets"][a]["traits"][i]["trait_type"];
	// 				delete json["assets"][a]["traits"][i]["value"];
	// 			}

	// 			//console.log(json["assets"][a]["traits"]);
	// 		}
	// 		console.log(json);
	// 		res.send(json);
	// 		// do something with JSON
	// 	  } catch (error) {
	// 		console.error(error.message);
	// 	  };
	// 	});

	//   }).on("error", (error) => {
	// 	console.error(error.message);
	//   });

	// const sdk = require('api')('@opensea/v1.0#1j3wv35kyd6wqwc');

	// sdk['retrieving-assets-rinkeby']({
	// owner: '0xdb4030177141884e56539231c61b759aca97129d',
	// asset_contract_address: '0xd2e52e588eb0cab69ca3289d60bde66406e238af',
	// order_direction: 'desc',
	// offset: '0',
	// limit: '20'
	// })
	// .then(data => {
	// 	console.log("OKEE");
	// 	console.log(data);
	// 	res.send(data);
	// })
	// .catch(err => {
	// 	console.log("ERROR");
	// 	console.error(err);
	// 	res.send({result: "fail"});
	// });

	// Metadata.findOne({ id: req.query.publicAddress }, (err, data) => {
	// 	if (!data) {
	// 		res.redirect('/');
	// 	} else {
	// 		res.send(data);
	// 	}
	// });
});

router.get('/loginGame', (req, res, next) => {
	let login = {};
	login.errorCode = 0;
	User.findOne({ username: req.query.username }, (err, data) => {
		if (!data) {
			login.errorCode = 1;
			res.send(login);
			return;
		} else {
			if (data.password.toString() !== req.query.password.toString())
			{
				login.errorCode = 1;
				res.send(login);
				return;
			}
			if (!data.isSigned)
			{
				login.errorCode = 2;
				res.send(login);
				return;
			}
			else
			{
				//public address da duoc dang ky
				console.log('thi bay gio dang ki' + data.publicAddress);

				let url = 'https://testnets-api.opensea.io/api/v1/assets?owner=' + data.publicAddress + '&asset_contract_address=' + contractAddress + '&order_direction=desc&offset=0&limit=20';
				console.log('thi bay gio dang ki with url' + url);
				https.get(url,(responeData) => {
					let body = "";

					responeData.on("data", (chunk) => {
					body += chunk;
					});

					responeData.on("end", () => {
					try {
						let json = JSON.parse(body);
						for (let a in json["assets"])
						{
							for (let i = 0; i < listAttributeRemove.length; i++)
							{
								delete json["assets"][a][listAttributeRemove[i]];
							}
							json["assets"][a].listAttribute = [0,0,0,0,0];
							json["assets"][a].listAttribute.length = 5;
							for (let i in json["assets"][a]["traits"])
							{
								for (let j = 0; j < listTraitsAttributeRemove.length; j++)
								{
									delete json["assets"][a]["traits"][i][listTraitsAttributeRemove[j]];
								}
								let key = json["assets"][a]["traits"][i]["trait_type"];
								let value = valueAttribute[json["assets"][a]["traits"][i]["value"]];
								json["assets"][a]["traits"][i][key] = value;
								delete json["assets"][a]["traits"][i]["trait_type"];
								delete json["assets"][a]["traits"][i]["value"];
								if (key == "gender")
								{
									json["assets"][a].gender = value;
									console.log("GENDER", value);
								}
								else
								{
									console.log("ID", part[key], " value: ", value);
									json["assets"][a].listAttribute[part[key]] = value;
								}
							}
							console.log(json["assets"][a].listAttribute);
							//console.log(json["assets"][a]["traits"]);
						}
						console.log(json);
						json.errorCode = 0;
						json.publicAddress =  data.publicAddress;
						res.send(json);
						// do something with JSON
					} catch (error) {
						console.error(error.message);
					};
					});

				}).on("error", (error) => {
					console.error(error.message);
				});
			}
			//return res.render('data.ejs', { "name": data.username, "publicAddress": data.publicAddress, "isSigned": data.isSigned });
		}
	});
});

router.get('/sign', (req, res, next) => {
	console.log(req.username+ ' doi dang ki dia chi ne');

	User.findOne({ username: req.username }, (err, data) => {
		if (!data) {
			res.redirect('/register');
		} else {
			if (data.isSigned)
			{
				return res.render('data.ejs', {"name": data.username, "publicAddress": data.publicAddress, "isSigned": data.isSigned });	
			}
			else
			{
				//neu chua dang ki public address
				console.log('thi bay gio dang ki');
			}
			//return res.render('data.ejs', { "name": data.username, "publicAddress": data.publicAddress, "isSigned": data.isSigned });
		}
	});
});

router.get('/logout', (req, res, next) => {
	if (req.session) {
		// delete session object
		req.session.destroy((err) => {
			if (err) {
				return next(err);
			} else {
				return res.redirect('/register');
			}
		});
	}
});

router.get('/forgetpass', (req, res, next) => {
	res.render("forget.ejs");
});

router.post('/forgetpass', (req, res, next) => {
	User.findOne({ email: req.body.email }, (err, data) => {
		if (!data) {
			res.send({ "Success": "This Email Is not regestered!" });
		} else {
			if (req.body.password == req.body.passwordConf) {
				data.password = req.body.password;
				data.passwordConf = req.body.passwordConf;

				data.save((err, Person) => {
					if (err)
						console.log(err);
					else
						console.log('Success');
					res.send({ "Success": "Password changed!" });
				});
			} else {
				res.send({ "Success": "Password does not matched! Both Password should be same." });
			}
		}
	});

});

async function compositeImages() {

}

function getInput(part,id)
{
	return "images/" + part + id + ".png";
}

router.get('/avatar/:attributeString', (req, res, next) => {
	console.log("Get avatar of id: ",req.params.attributeString);
	let arrayAtt = [];
	for (var i = 0; i < req.params.attributeString.length; i ++)
	{
		arrayAtt.push(req.params.attributeString[i]);
	}
	let blendType = (arrayAtt[5] == 1)?"over":"soft-light";
	sharp("images/zbackground.png")
	.composite(
		[
			{
				input: getInput("legs",arrayAtt[2]),
				top: 1200,
				left: 1350,
				blend: blendType,
			},
			{
				input: getInput("hand",arrayAtt[4]),
				top: 890,
				left: 1500,
				blend: blendType,
			},
			{
				input: getInput("tail",arrayAtt[3]),
				top: 1000,
				left: 220,
				blend: blendType,
			},
			{
				input: getInput("body",arrayAtt[0]),
				top: 400,
				left: 980,
				blend: blendType,
			},
			{
				input: getInput("hand",arrayAtt[4]),
				top: 895,
				left: 1450,
				blend: blendType,
			},
			{
				input: getInput("head",arrayAtt[1]),
				top: 370,
				left: 1530,
				blend: blendType,
			},
			{
				input: getInput("legs",arrayAtt[2]),
				top: 1200,
				left: 1160,
				blend: blendType,
			},
		]
	)
	// .resize({width: 400, height: 400})
	.png()
	.toBuffer()
	.then(data => res.type('png').send(data))
});


module.exports = router;