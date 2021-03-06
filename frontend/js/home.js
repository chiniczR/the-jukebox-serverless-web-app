var at; // Authorization Token to be received from Cognito if there is a user logged in

var poolData = {    // Cognito user pool data
    UserPoolId: _config.cognito.userPoolId,
    ClientId: _config.cognito.userPoolClientId
};

var userPool, authToken, username;

// Cognito must be configured for the site to work properly
if (!(_config.cognito.userPoolId &&
    _config.cognito.userPoolClientId &&
    _config.cognito.region)) {
    alert("Amazon Cognito is not configured!")
}
else {
    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    function signOut() {
        userPool.getCurrentUser().signOut();
        window.location.reload()
    };

    // Go check with Cognito if there is a user currently logged in here
    authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            if (cognitoUser.username) {
                username = cognitoUser.username
            }
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } 
                else if (!session.isValid()) {
                    resolve(null);
                } 
                else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } 
        else {  // If there is no user logged in here
            resolve(null);
        }
    });
    // Run the above check and then:
    authToken.then(function setAuthToken(token) {
        if (token) {    // If we got a token => there is a user logged in
            at = token
            setTimeout(() => {  // Give the document time to load
                changeLoginBtn()
                document.getElementById('signupBtn').classList.add('disabled')
                document.getElementById('signupBtn').onclick = (event) => { event.preventDefault(); }
                document.getElementById('signupBtn').setAttribute("data-toggle", "tooltip")
                document.getElementById('signupBtn').setAttribute("title", "You are currently logged in!")
                document.getElementById('greeting').textContent = 'Logged in as ' + username
                
                // Here we are going to retrieve the user's guest-cart, write to their user-
                // cart the items that weren't there before and then clear their guest-cart

                // Initialize the Amazon Cognito credentials provider
                AWS.config.region = _config.identity.idPoolId; // Region
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: _config.identity.region,
                });

                // Getting the current user's guest IdentityID
                var identityId = AWS.config.credentials.identityId;

                // Create the DynamoDB service object
                var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

                // Here we contact the DynamoDB table for session (i.e. cart) management
                // Set the params to request the user's current stored cart
                var params = {
                    Key: {
                        "IdentityID": {
                            S: identityId
                        }
                    },
                    TableName: "JukeboxGuestCarts",
                    AttributesToGet: [
                        'CartItems'
                    ]
                };
                // Make the request
                ddb.getItem(params, function (err, data) {
                    if (err) alert(err + '\n' + err.getMessage()); // An error occurred
                    else if (data["Item"]) {    // If there items and we haven't already written them to the user-cart
                        // Get the list of items in the cart
                        var cart = data["Item"]["CartItems"]["NS"]
                        const headers = {
                            Authorization: at // The received authentication token
                        }
                        // Post the guest-cart to their user-cart
                        const url = _config.api.invokeUrl + '/addcart'
                        $.ajax({
                            method: 'POST',
                            url: url,
                            headers: headers,
                            data: JSON.stringify({
                                Items: cart
                            }),
                            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                                alert('An error occured when adding item to cart:\n' + JSON.stringify(jqXHR));
                            }
                        });
                        delete params["AttributesToGet"]
                        // Delete their guest-cart
                        ddb.deleteItem(params, function(err1, data1) {
                            if (err1) alert("An error occured when clearing guest cart:\n" + err1)
                        })
                    }
                });
            }, 100);
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.assign('./login.html');
    });
}

function changeLoginBtn() {
    var loginBtn = document.getElementById('loginBtn')
    loginBtn.textContent = 'Logout  '
    var icon = document.createElement('i')
    icon.classList.add('fas', 'fa-sign-out-alt')
    loginBtn.appendChild(icon)
    loginBtn.onclick = (event) => {
        event.preventDefault();
        loginBtn.outerHTML = '<a class="nav-link text-dark" id="loginBtn" href="./login.html">Login <i class="fas fa-sign-in-alt"></i></a>'
        signOut();
    }
}