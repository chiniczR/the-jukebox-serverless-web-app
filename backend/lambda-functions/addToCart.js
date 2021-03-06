const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();

exports.handler = (event, context, callback) => {
    if (!event.requestContext.authorizer) {
        errorResponse('Authorization not configured', context.awsRequestId, callback);
        return;
    }
    console.log('Received event: ', event);

    // Because we're using a Cognito User Pools authorizer, all of the claims
    // included in the authentication token are provided in the request context.
    // This includes the username as well as other attributes.
    const username = event.requestContext.authorizer.claims['cognito:username'];

    const requestBody = JSON.parse(event.body);

    const itemId = requestBody.ItemID

    var cart = [ itemId.toString() ]
    console.log("Going to look for username: ", username)
    ddb.getItem({
        Key: {
            "Username": { S: username}
        },
        TableName: "JukeboxUserCarts",
        AttributesToGet: [
            "CartItems"
        ]
    },
    (err, data) => {
        if (err) errorResponse(err.message, context.awsRequestId, callback)
        else if (data['Item']) {
            var currCart = data["Item"]["CartItems"]["NS"]
            cart = currCart.toString().split(',');
            if (cart.includes(itemId.toString())) { 
                console.log('Item with ID=', itemId, ' is already in the cart of user=', username)
                callback(null, {
                    statusCode: 201,
                    body: JSON.stringify({}),
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
            cart.push(itemId.toString());
            ddb.updateItem({
                TableName: "JukeboxUserCarts",
                Key: { Username: { S: username } },
                UpdateExpression: "SET CartItems = :c",
                ExpressionAttributeValues: {
                    ":c": { NS: cart }
                },
                ReturnValues: "UPDATED_NEW"
            },
            (err1, data1) => {
                if (err1) errorResponse(err1.message, context.awsRequestId, callback)
                else {
                    console.log('Updated:\n', JSON.stringify(data1))
                    callback(null, {
                        statusCode: 201,
                        body: JSON.stringify({}),
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                        },
                    }); 
                }
            })
        }
        else {
            console.log('After find')
            ddb.putItem({
                TableName: "JukeboxUserCarts",
                Item: {
                    Username: { S: username },
                    CartItems: { NS: cart }
                }
            },
            (err2, data2) => {
                if (err2) errorResponse(err2.message, context.awsRequestId, callback)
                else {
                    console.log('Put item with ID=', itemId, ' into the cart of user=', username)
                    callback(null, {
                        statusCode: 201,
                        body: JSON.stringify({}),
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                        },
                    }); 
                }
            })
        }
    })
}

function errorResponse(errorMessage, awsRequestId, callback) {
    callback(null, {
        statusCode: 500,
        body: JSON.stringify({
            Error: errorMessage,
            Reference: awsRequestId,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    });
}