/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const path = require('path');
const nodemailer = require('nodemailer');

var request = require('request')

require('dotenv').config();
const axios = require('axios');

let smtpConfig = {
  host: 'smtp.gmail.com', // you can also use smtp.gmail.com
  port: 465,
  secure: true, // use TLS
  auth: {
      user: 'testwatson36@gmail.com', 
      pass: 'taklamp1'
  }
};

// middleware --ok
var Botkit = require('botkit');
var middleware = require('botkit-middleware-watson')({
  iam_apikey_name: process.env.ASSISTANT_IAM_APIKEY_NAME,
  iam_serviceid_crn: process.env.IAM_SERVICEID_CRN,
  password: process.env.ASSISTANT_PASSWORD,
  username: process.env.ASSISTANT_USERNAME,
  workspace_id: process.env.WORKSPACE_ID,
  workspace_url: process.env.ASSISTANT_WORKSPACE_URL || 'https://gateway.watsonplatform.net/assistant/api',
  version: '2018-07-10'
});

// Configure your bot.
var slackController = Botkit.slackbot();
var slackBot = slackController.spawn({
  token: process.env.SLACK_TOKEN,
  client_id: process.env.SLACK_CLIENT_ID,
  client_secret: process.env.SLACK_CLIENT_SECRET,
  signing_secret: process.env.SLACK_SIGNING_SECRET,
  verification: process.env.SLACK_VERIFICATION_TOKEN,
  oauth: process.env.SLACK_OAUTH_ACCESS_TOKEN,
  botUserOAuthAccess: process.env.BOT_USER_OAUTH_ACCESS_TOKEN
});
slackController.hears(['.*'], ['direct_message', 'direct_mention', 'mention', 'app_mention', 'message_received'], function(bot, message) {
  slackController.log('Slack message received');
  middleware.interpret(bot, message, function() {
  if (message.watsonError) {
    bot.reply(message, "Sorry, there are technical problems.");     // deal with watson error
  } else {
    if (message.watsonData.intents.length == 0) {
	    return new Promise(function (resolve, reject) {
      bot.reply(message, 'Jag förstod inte riktigt, skulle du kunna omformulera dig?, \n På annat sätt, Tack, Frågan är vidarebefordrad och du kommer att få ett svar inom kort.');
      let response = {
          msg: 'E-mail was sent'
      }; 
      sendEmail(message, function (email_response) {
        response.msg = email_response['msg'];
        response.code = email_response['code'];
        response.reason = email_response['reason'];
        console.log(`Email delivery response: (${email_response['code']}) ${response.msg}`);
        resolve(response);
    });

    function sendEmail(message, callback) {
      let transporter = nodemailer.createTransport(smtpConfig);
      let mailOptions = {
          from: `jokebot2019 <${smtpConfig.auth.user}>`,
          to: 'joseph.tebyasas@cooach.se', //params.email,
          subject: `[Cooach] Hotels Booking: ${message.user + '--Question--' + message.text}`,
          text: `Do not reply just find user id in slack!`
      };
      transporter.sendMail(mailOptions, function (error, info) {
        
          let email_response = {
              code: 200,
              msg: 'Email was sent successfully',
              reason: 'Success'
          };
    
          if (error) {
              email_response.msg = 'Error';
              email_response.code = 500;
              email_response.reason = error;
          }
          else {
              email_response.msg = info.response;
              email_response.code = 200;
              email_response.reason = info.response;
          }
          callback(email_response);
      });
    }
  });
      //bot.reply(message, "Sorry, Do you want me to check this and come back to you?.");     // was any intent recognized?
    } else if (message.error) {
      bot.reply(message.error, "Yes sure, I will send to the support team.");      // is the confidence high enough?
    } else {
      bot.reply(message, message.watsonData.output.text.join('\n'));      // reply with Watson response
    }
  }
})
});

slackBot.startRTM();

const app = express();
var port = process.env.PORT || 5000;
app.set('port', port);
app.listen(port, function() {
  console.log('Client server listening on port ' + port);
});
