var client = {};
$(document)
    .ready(
        function () {
            app.initialized()
                .then(
                    function (_client) {
                        client = _client;
                        client.events.on('app.activated',
                            function () {
                                displayInApp();
                            }
                        );


                    },
                    function (err) {
                        console.log(err.message);
                        manageNotifs(err.message, 'warning', 'Error!')
                    }
                );
        }
    );


function displayInApp() {

    client.data.get('ticket')
        .then(
            function (data) {
                let ticket_id = data.ticket.id;
                getIssueNumber(ticket_id);
            },
            function (error) {
                console.error("error displayed:", error.message);
                manageNotifs(error.message, 'warning', 'Error!')
            }
        );

}

function getIssueNumber(ticket_id) {

    // console.log("inside getIssueNumber");
    client.db.get(`ticket${ticket_id}`)
        .then(
            function (data) {
                $("#create-issue").hide();
                getIssueDetails(data);

            },
            function (error) {
                console.info(error.message);
                createNewIssue();
            }
        );
}


function createNewIssue() {
    // console.log("inside the createNewIssue");

    document.getElementById('create-issue').innerText = "Click to Create Issue";
   
    $("#create-issue").click(
        function () {
            displayTicketDetails();
        }
    );
}

function getIssueDetails(data) {


    client.request.invoke('getIssue', { "data": data })
        .then(
            function (data) {
                console.log("data", data);
                data = data.response;
                console.info('Issue fetched successfully. ', data);
                displayIssueDetails(data);

            }
        ),
        function (error) {
            console.info(error);

        }
}

function displayIssueDetails(data) {
    document.getElementById('issue-link').href = data.html_url;

    document.getElementById('issue-link').innerText = "Issue Number_" + data.number;
    document.getElementById('heading').innerText = "Github Issue Details";
    document.getElementById('lbl-issueTitle').innerText = "Issue Title:";
    document.getElementById('issueTitle').innerText = data.title;
    document.getElementById('issueState').innerText = data.state;
    document.getElementById("lbl-issueState").innerText = "Issue State:"
}


function displayTicketDetails() {

    // console.log("inside displayTicketDetails");
    let modalData = {};

    Promise.all([client.data.get('ticket'), client.data.get('contact')])
        .then(function (data) {
            console.info(data[0], 'ticket Data');

            modalData.name = data[1].contact.name;
            modalData.description_text = data[0].ticket.description_text;
            modalData.status_label = data[0].ticket.status_label;
            modalData.subject = data[0].ticket.subject;

            sendDataToModal('Convert ticket into Issue', 'modal.html', modalData);
        },
            function (error) {
                console.error(error.message);
                manageNotifs(error.message, "warning", "Error!");
            }

        );
}


function sendDataToModal(title, template, modalData) {
    client.interface.trigger("showModal",
        {
            title: title,
            template: template,
            data: modalData
        }
    )
        .then(
            function () {
                
                client.instance.receive(
                    function (event) {
                        var data = event.helper.getData();
                        if (data.message.title !== "----------------") {
                            fetchIssueDetails(data);
                        }
                        else {
                            displayInApp();
                        }
                    }
                ),
                    function (err) {
                        console.error(err.message);
                        manageNotifs(err.message, "warning", "Error!");
                    }
            }
        ).catch(function (error) {
            console.log(error.message);
        });
}


function manageNotifs(message, type, title) {
    client.interface.trigger("showNotify", {
        type: type, title: title,
        message: message

    }).then(function () {
        // data - success message
    }).catch(function () {
        // error - error object
    });
}

function fetchIssueDetails(data) {
    $("#create-issue").hide();
    /* Output: {senderId: "4", message: {name: "James", email: "james.dean@freshdesk.com"}} */

    displayIssueDetails(data.message);
    let notifMessage = `Issue has been created for this ticket with a title: '${data.message.title}'`;
    manageNotifs(notifMessage, "success", "Success!");
}