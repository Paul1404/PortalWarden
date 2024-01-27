        // Initialize the DataTables after the DOM is fully loaded
        $(document).ready(function() {
            // Initialize DataTables
            $('#usersTable').DataTable({
                "responsive": true,
                "lengthChange": false,
                "autoWidth": false,
            });

            $('#rfidTagsTable').DataTable({
                "responsive": true,
                "lengthChange": false,
                "autoWidth": false,
                "columnDefs": [
                    {
                        "targets": 0,
                        "render": function(data, type, row) {
                            return data.length > 60 ? data.substr(0, 60) + '…' : data;
                        }
                    }
                ]
            });

            // Fetch data for both tables
            fetchUsers();
            fetchRfidTags();
        });


        function addTag() {
            var tagUid = document.getElementById('addTagInput').value;
            var username = document.getElementById('addUsernameInput').value; // Get the username from the form
        
            axios.post('/add-rfid', { tagUid: tagUid, username: username }) // Include the username in the POST request
                .then(function (response) {
                    alert('Tag added: ' + tagUid);
                    document.getElementById('addTagInput').value = '';
                    document.getElementById('addUsernameInput').value = ''; // Clear the username input field
                })
                .catch(function (error) {
                    alert('Error adding tag: ' + error);
                });
        }
        

        function removeTag() {
            var tagUid = document.getElementById('removeTagInput').value;
            axios.delete('/remove-rfid/' + tagUid)
                .then(function (response) {
                    alert('Tag removed: ' + tagUid);
                    document.getElementById('removeTagInput').value = '';
                })
                .catch(function (error) {
                    alert('Error removing tag: ' + error);
                });
        }

        function addUser() {
            var username = document.getElementById('addUsername').value;
            var password = document.getElementById('addPassword').value;
            axios.post('/add-user', { username: username, password: password })
                .then(function (response) {
                    alert('User added: ' + username);
                    document.getElementById('addUsername').value = '';
                    document.getElementById('addPassword').value = '';
                })
                .catch(function (error) {
                    alert('Error adding user: ' + error);
                });
        }

        function removeUser() {
            var username = document.getElementById('removeUsername').value;
            axios.delete('/remove-user/' + username)
                .then(function (response) {
                    alert('User removed: ' + username);
                    document.getElementById('removeUsername').value = '';
                })
                .catch(function (error) {
                    alert('Error removing user: ' + error);
                });
        }

        function confirmLogout() {
        if (confirm("Are you sure you want to logout?")) {
            location.href = '/logout';
        }
        }

        function fetchUsers() {
            fetch('/users')
                .then(response => response.json())
                .then(users => {
                    // Clear the table before adding new data
                    const table = $('#usersTable').DataTable();
                    table.clear();
        
                    // Add the fetched users to the DataTable
                    users.forEach(user => {
                        table.row.add([
                            user.username,       // Username
                            user.createdAt       // Creation timestamp
                        ]);
                    });
        
                    // Draw the table to show the new data
                    table.draw();
                })
                .catch(error => console.error('Error fetching users:', error));
        }
        

        function fetchRfidTags() {
            fetch('/rfid-tags')
                .then(response => response.json())
                .then(tags => {
                    // Clear the table before adding new data
                    const table = $('#rfidTagsTable').DataTable();
                    table.clear();
        
                    // Add the fetched RFID tags to the DataTable
                    tags.forEach(tag => {
                        table.row.add([
                            tag.username,  // Username associated with the tag
                            tag.tag  // RFID Tag UID
                        ]);
                    });
        
                    // Draw the table to show the new data
                    table.draw();
                })
                .catch(error => console.error('Error fetching RFID tags:', error));
        }
        
     