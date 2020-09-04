## Your First App

This app provides an integration between Freshdesk and Github. The Agent is provided with a UI 
to convert a Freshdesk ticket into a Github Issue. The ticket in Freshdesk and the issue in Github 
will be in sync - Any note added in Freshdesk, goes to Github and similarly any response in Github 
comes back as a note in the same Freshdesk ticket. When the ticket is closed in Freshdesk, it also 
closes the issue in Github.


        

### Folder structure explained

    .
    ├── README.md                  This file
    ├── app                        Contains the files that are required for the front end component of the app
    │   ├── app.js                 JS to render the dynamic portions of the app
    │   ├── icon.svg               Sidebar icon SVG file. Should have a resolution of 64x64px.
    │   ├── freshdesk_logo.png     The Freshdesk logo that is displayed in the app
    │   ├── style.css              Style sheet for the app
    │   ├── template.html          Contains the HTML required for the app’s UI
    ├── config                     Contains the installation parameters and OAuth configuration
    │   ├── iparams.json           Contains the parameters that will be collected during installation
    │   └── iparam_test_data.json  Contains sample Iparam values that will used during testing
    └── manifest.json              Contains app meta data and configuration information
