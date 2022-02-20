const mongoose = require('mongoose');
const Schema = mongoose.Schema;

metadataSchema = new Schema( {
	id: Number,
	attributes:[{
        trait_type: String,
        value: String
    }],
    description: String,
	image: String,
	name: String
}),
Metadata = mongoose.model('Metadata', metadataSchema);

module.exports = Metadata;