const repo = 'github-test-integration';
const owner = 'Akshara-K';

var client = {};
$(document).ready(function () {
    app.initialized()
        .then(
            function (_client) {
                client = _client;

                getContext();
                document.getElementById('raiseAsIssue').onclick = function () {
                    raiseIssue();
                }

                document.getElementById('closeModal').onclick = function () {
                    console.info("Closing Modal");
                    let response = { "title": "----------------" }
                    client.instance.send({
                        message: response
                    });

                    client.instance.close();
                }


            },
            function (err) {
                console.error(err.message);

            }
        );

});


function getContext() {
    client.instance.context()
        .then(
            function (context) {

                document.getElementById('requester').value = context.data.name;
                document.getElementById('ticketDesc').value = context.data.description_text;
                document.getElementById('ticketSubject').value = context.data.subject;
                document.getElementById('ticketStatus').value = context.data.status_label;

            },
            function (err) {
                console.log(err.message);
            }
        );
}

function raiseIssue() {
    // console.info("---------------------------");
    // console.info("Inside raiseIssue()...");

    client.data.get('ticket')
        .then(
            function (data) {

                data.ticket.description_text = document.getElementById('ticketDesc').value;
                data.ticket.status_label = document.getElementById('ticketStatus').value;
                data.ticket.subject = document.getElementById('ticketSubject').value;

                issueCreateSMI(data);
            },
            function (error) {
                console.log(error.message);
            }
        );
}


function issueCreateSMI(data) {
    // console.info("---------------------------");
    // console.info("Inside issueCreateSMI()...");

    client.request.invoke('createIssue', { "data": data })
        .then(
            function (args) {
                console.info('Issue created successfully.');
                args = args.response;
                console.log(args);
                showCreatedIssueDetails(args);

            }
        ),
        function (error) {
            console.info(error);
        }
}

function showCreatedIssueDetails(response) {

    //send data back to parent location 
    client.instance.send({
        message: response
    });
    /* message can be a string, object, or array */
    client.instance.close();
}