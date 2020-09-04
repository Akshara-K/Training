const repo = 'github-test-integration';
const owner = 'Akshara-K';

exports = {

  events: [
    { event: "onAppInstall", callback: "onAppInstallHandler" },
    { event: "onTicketUpdate", callback: "updateIssueFromTicket" },
    { event: "onConversationCreate", callback: "createCommentHandler" },
    { event: "onExternalEvent", callback: "onExternalEventHandler" },
    { event: "onAppUninstall", callback: "onAppUninstallHandler" }
  ],
  onAppInstallHandler: function () {
    generateTargetUrl()
      .then(function (targetUrl) {

        $db.set("webHookUrl", {
          url: targetUrl
        });
        renderData(null, "Webhook Registration Successful"); // message obj 
      })
      .fail(function (err) {
        renderData({
          message: err
        });
      });
  },
  createIssue: function (payload) {

    console.info("-----------------------------------------");
    console.info("Inside createIssue");

    let ticket_id = payload.data.ticket.id;
    let title = payload.data.ticket.subject;
    //let body = "Pushed from Freshdesk! [Issue created for Ticket]" + payload.data.ticket.description_text;
    let body = payload.data.ticket.description_text;
    let options = getAuthGithub();
    let url = `${payload.iparams['githubUrl']}/repos/${owner}/${repo}/issues`;


    options['body'] = JSON.stringify({ 'title': title, 'body': body });
    // console.info(options);
    $request.post(url, options)
      .then(
        function (data) {

          data = JSON.parse(data.response);
          console.info(data, 'Issue created');
          let issue_number = data.number;
          storeInAppDB(ticket_id, issue_number);
          //console.log("Stored in DB");
          renderData(null, data);
          addSourceComment("[Issue created for Ticket]", issue_number);


        },
        function (err) {
          console.error(err, 'Error occurred in create operation');
          renderData(err);
        }
      );

  },

  getIssue: function (payload) {
    console.info("-----------------------------------------");
    console.info("Inside getIssue");


    let issue_number = payload.data.issue_number;

    let url = `<%= iparam.githubUrl %>/repos/${owner}/${repo}/issues/${issue_number}`;

    let options = getAuthGithub();


    $request.get(url, options)
      .then(
        function (data) {

          data = JSON.parse(data.response);
          console.info(data, 'Issue fetched correctly');
          renderData(null, data);

        },
        function (err) {
          console.error(err, 'Error occurred in issue fetch operation');
          renderData(err);
        }
      );

  },

  updateIssueFromTicket: async function (payload) {

    console.info("-----------------------------------------");
    console.info('Inside Update issue Handler');

    let ticket_id = payload["data"]["ticket"]["id"];

    let data = await getIssueNumber(ticket_id)

    if (data) {
      let issue_number = data['issue_number'];
      updateIssue(payload, issue_number);

    }
    else {
      console.error("no ticket found ");
    }

  },

  createCommentHandler: async function (payload) {

    // console.info("-----------------------------------------");
    // console.info("Inside createComment Handler() ");

    let ticket_id = payload.data.conversation.ticket_id;
    let note_id = payload.data.conversation.id;

    let data = await getIssueNumber(ticket_id)
    // console.log(data);

    let recentNote = payload.data.conversation["body_text"];

    if (recentNote.substring(0, 19) !== 'Pushed from Github!') {
      performCreateCommentHandling(data, payload, note_id);
    }


  },


  onAppUninstallHandler: function () {

    //console.info("-----------------------------------------");
    $db.delete("webHookUrl").then(
      function (data) {
        console.log(data);
        renderData();
        console.info("Webhook Deregistration Successful");
      },
      function (error) {
        console.log(error)
        // failure operation
        renderData({ message: "Uninstallation failed due to network error." });
      });

  },

  onExternalEventHandler: async function (payload) {
    // console.info("-----------------------------------------");
    // console.info(`Inside External event Handler`);

    let recentComment = ""

    let issue_number = payload.data.issue.number;
    if ('comment' in payload.data)
      recentComment = payload.data.comment.body;
    else
      recentComment = payload.data.issue.body;

    // console.log(recentComment);

    if (recentComment.substring(0, 22) !== 'Pushed from Freshdesk!') {
      let data = await getTicketId(issue_number)
      //data.note_id has note_id
      performExtEventHandling(data, payload, issue_number);

    }
    else {
      console.log("Ext Event Handler Loop prevented");
    }

  }


};

function addSourceComment(op, issue_number) {
  let commentText = "Pushed from Freshdesk! " + op;
  let body = { "body": commentText };
  let url = `<%= iparam.githubUrl %>/repos/${owner}/${repo}/issues/${issue_number}/comments`;

  let options = getAuthGithub();
  options['body'] = JSON.stringify(body);

  return $request.post(url, options)
    .then(
      function () {
        console.log("Source Comment added for ", op);
      }
    ), function (err) {
      console.error(err);
    }
}

function addSourceNote(op, ticket_id) {
  // console.log("--------------------")
  // console.log("inside Source Note ffunction");

  let noteText = "Pushed from Github! " + op;
  let body = {
    "body": noteText,
    "private": true
  }
  let url = `https://<%=iparam.freshdeskDomain%>.freshdesk.com/api/v2/tickets/${ticket_id}/notes`;
  let options = getAuthFW();

  options['body'] = JSON.stringify(body);

  $request.post(url, options)
    .then(
      function () {
        console.info('Source Note Added');

      }, function (err) {
        console.error(err);
      });



}

function performCreateCommentHandling(data, payload, note_id) {
  if (data) {

    // console.log("inside performCreateCommentHandling");
    let issue_number = data.issue_number;
    createComment(payload, issue_number)
      .then(
        function (APIResponse) {

          APIResponse = JSON.parse(APIResponse.response);
          let comment_number = APIResponse["id"];

          console.info("ConversationCreateHandler(create) Successful");
          storeCommentInAppDB(note_id, comment_number);
        },
        function (error) {
          console.error(error);
        }
      );

  } else {
    console.error("push new Comment operation failed");
  }
}
function performExtEventHandling(data, payload) {

  // console.log("---------------");
  // console.log("inside performExtEventHandling");
  if (data) {
    console.log("inside if(data)");
    let action = payload.data.action;
    let ticket_id = data['ticket_id'];

    checkIssueUpdate(payload, action, ticket_id);
    checkCommentUpdate(payload, action, ticket_id);
  }
  else {
    console.error("data is null");
  }

}

function checkIssueUpdate(payload, action, ticket_id) {

  if (action === "closed" || action === "reopened") {
    // console.log("inside checkISsueUpdate");
    updateTicket(payload, ticket_id);
  }
  // console.log("leaving checkIssueUpdate");
}
function checkCommentUpdate(payload, action, ticket_id) {
  // console.log("inside checkComment");

  if ((action === "edited") && ('comment' in payload.data)) {

    updateNote(payload)
      .then(
        function (data) {
          data = JSON.parse(data.response);
          console.info(data, 'External Event Handled (updating note) successfully!');

        }, function (err) {
          console.error(err, 'Error occurred in External Event Handling (updating note)');
        }
      );
  }

  if ((action === "created") && ('comment' in payload.data)) {
    createNote(payload, ticket_id);
  }

}
async function getIssueNumber(ticket_id) {
  // console.log("-------------------------------------------");
  // console.info("inside getIssueNumber");

  try {
    let data = await $db.get(`ticket${ticket_id}`)
    return data;
  }
  catch (error) {
    console.error(error.message);
    return null;
  }

}

async function getTicketId(issue_number) {
  // console.info("-----------------------------------------");
  // console.info(`Inside getTicketId`);


  try {
    let data = await $db.get(`issue${issue_number}`)
    return data;
  }
  catch (error) {
    console.error(error.message);
    return null;
  }
}

function createNote(payload, ticket_id) {

  // console.log("----------------------------")
  // console.log("inside createNote");

  let noteText = "Pushed from Github! : " + payload.data.comment.body;

  let comment_number = payload.data.comment.id;

  let body = {
    "body": noteText,
    "private": false
  };



  let url = `https://<%=iparam.freshdeskDomain%>.freshdesk.com/api/v2/tickets/${ticket_id}/notes`;
  let options = getAuthFW();

  options['body'] = JSON.stringify(body);

  // console.log(options);
  // console.log(url);

  $request.post(url, options)
    .then(
      function (data) {
        console.info(data, 'External Event Handled (creating note) successfully!');
        data = JSON.parse(data.response);
        let note_id = data.id;
        storeCommentInAppDB(note_id, comment_number);

      }, function (err) {
        console.error(err, 'Error occurred in External Event Handling (creating note)');
      });


}


async function getNoteId(comment_number) {
  // console.log("----------------------------")
  // console.log("inside getNoteId");

  try {
    let data = await $db.get(`comment${comment_number}`)
    return data;
  }
  catch (error) {
    console.error(error.message);
    return null;
  }

}

async function updateNote(payload) {
  // console.info("-----------------------------------------");
  // console.info(`Inside updateNote`);

  let comment_number = payload.data.comment.id;


  let data = await getNoteId(comment_number);

  if (data) {
    let note_id = data['note_id'];
    let noteText = "Pushed from Github! [Updated] : " + payload.data.comment.body;


    let body = {
      "body": noteText
    };


    let url = `https://<%=iparam.freshdeskDomain%>.freshdesk.com/api/v2/conversations/${note_id}`;
    let options = getAuthFW();

    options['body'] = JSON.stringify(body);

    // console.log(options);
    // console.log(url);

    return $request.put(url, options);


  }
  else {
    console.log("No comment found to update ");
    return null;
  }



}


function updateTicket(payload, ticket_id) {

  // console.info("-----------------------------------------");
  // console.info(`Inside updateTicket`);

  let newBody = {
    "newStatus": payload.data.issue.state
  };

  let url = `https://<%=iparam.freshdeskDomain%>.freshdesk.com/api/v2/tickets/${ticket_id}`;
  let options = getAuthFW();

  let body = { "status": getTicketState(newBody.newStatus) };



  options['body'] = JSON.stringify(body);
  //console.log(options);
  // console.log("url", url);

  $request.put(url, options)
    .then(
      function (data) {
        console.info(data, 'External Event Handled successfully! (TicketUpdate) ');
        addSourceNote("[Ticket Updated for Issue]", ticket_id);
      }, function (err) {
        console.error(err, 'Error occurred in External Event Handling');
      });
}


function createComment(payload, issue_number) {

  // console.info("--------------------------------")
  // console.info("Inside createComment() ")

  let commentType = "";
  let commentText = payload['data']['conversation']['body_text'];

  let arg = {
    "commentText": commentText,
    "CommentType": commentType
  }
  prepareComment(payload, arg);

  console.info("--------------------------------")

  let url = `<%= iparam.githubUrl %>/repos/${owner}/${repo}/issues/${issue_number}/comments`;

  let options = getAuthGithub();
  options['body'] = JSON.stringify({ "body": arg.commentText });
  return $request.post(url, options);

}

function prepareComment(payload, arg) {

  console.info("--------------------------------")
  console.info("Inside prepareComment() ")
  let noteSource = payload.data.conversation['source'];
  let isPrivate = payload.data.conversation['private'];

  if (noteSource === 0) {
    arg.commentType = `[Reply]: `;

  }

  if (noteSource === 2) {
    if (isPrivate) {
      arg.commentType = `[Private Note] : `;
    }
    else {
      arg.commentType = `[Public Note added] : `;

    }
  }

  arg.commentText = "Pushed from Freshdesk!" + arg.commentType + arg.commentText;

  let ifTruncated = payload['data']['conversation']['is_body_text_truncated'];
  if (ifTruncated) {
    arg.commentText = arg.commentText + " (NOTE: This text is truncated, please check source).";
  }
}

function storeCommentInAppDB(note_id, comment_number) {

  // console.log("inside storeCommentInAppDB");
  let note = `note${note_id}`;
  let comment = `comment${comment_number}`;

  $db.set(note, {
    'comment_number': comment_number
  });

  $db.set(comment, {
    'note_id': note_id
  });
}

function updateIssue(payload, issue_number) {

  let status = payload.data.ticket.status;
  let state = getIssueState(status);

  let url = `${payload.iparams['githubUrl']}/repos/${owner}/${repo}/issues/${issue_number}`;

  let options = getAuthGithub();
  options['body'] = JSON.stringify({ "state": state });
  console.log(url);

  $request.post(url, options).then(function (data) {
    console.info(data, 'updateIssueHandler successfull! Issue updated is: ', issue_number);
    addSourceComment("[Issue Updated from Ticket]", issue_number);
  }, function (err) {
    console.error(err, 'Error occurred in updateIssueHandler ');
  });

}

function getIssueState(status) {
  let state = "";
  if (status === 5) {
    state = "closed";
  } else {
    state = "open";
  }

  return state;
}

function getTicketState(state) {
  let status = 0;

  if (state === "open") {
    status = 2;
  }
  if (state === "closed") {
    status = 4;
  }

  return status;
}



function storeInAppDB(ticket_id, issue_number) {

  let ticket = `ticket${ticket_id}`;
  let issue = `issue${issue_number}`;

  $db.set(ticket, {
    'issue_number': issue_number
  });

  $db.set(issue, {
    'ticket_id': ticket_id
  });

}

function getAuthFW() {
  return {
    headers: {
      "Authorization": `Basic <%= encode(iparam.freshdeskApiKey) %>`,
      "Content-Type": "application/json"
    }
  }
}


function getAuthGithub() {
  return {
    headers: {
      "Authorization": `token <%= encode(iparam.githubApiKey) %>`, 
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Akshara-K"
    }
  }
}

