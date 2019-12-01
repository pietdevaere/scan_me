// https://stackoverflow.com/questions/19189785/is-there-a-good-cookie-library-for-javascript
document.getCookie = function(sName) {
    sName = sName.toLowerCase();
    var oCrumbles = document.cookie.split(';');
    for(var i=0; i<oCrumbles.length;i++) {
        var oPair= oCrumbles[i].split('=');
        var sKey = decodeURIComponent(oPair[0].trim().toLowerCase());
        var sValue = oPair.length>1?oPair[1]:'';
        if(sKey == sName)
            return decodeURIComponent(sValue);
    }
    return '';
}

document.setCookie = function(sName,sValue) {
    var oDate = new Date();
    oDate.setYear(oDate.getFullYear() + 10);
    var sCookie = encodeURIComponent(sName) + '=' + encodeURIComponent(sValue) + ';expires=' + oDate.toGMTString() + ';path=/';
    document.cookie= sCookie;
}

function barcode_reader(callback_function){
    var char_buffer = "";
    var callback = callback_function || function(){};

    var is_accepted_char = function(key){
        return key.length === 1;
    }

    var incomming_keystroke = function(event){
        if (event.key === "Enter") {
            console.log("Calling BarcodeReader callback with string: " + char_buffer);
            callback(char_buffer);
            char_buffer = "";
        } else if (is_accepted_char(event.key)) {
            //console.log("Adding char to barcodereader: " + event.key);
            char_buffer += event.key;
        } 
    }

    return {
        update_callback: function(new_callback){
            callback = new_callback;
        },
        // update_conditional_callback: function(new_callback, condition){
        //     callback = function(user_input){
        //         if (user_input === condition){
        //             new_callback(user_input);
        //         } 
        //     }
        // },
        update_conditional_callback: function(callback_list){
            callback = function(user_input){
                var callback_entry;
                for (callback_entry of callback_list){
                    if (user_input == callback_entry['condition']){
                        callback_entry['function'](user_input);
                    }
                }
            }
        },
        clear_callback: function(){
            callback = function(){};
        },
        register_listener: function(){
            document.addEventListener('keydown', incomming_keystroke)
        }
    }
}

function barcode_game(){
    var game_state = "init";
    var game_barcodes = [];
    var game_barcode_height = 20;
    var game_barcode_width = 2;
    var barcode_length = 7;
    var barcodes_per_game = 20;
    var max_scoreboard_size = 10;
    var start_time;
    var max_user_name_length = 10;

    var reader = barcode_reader();
    reader.register_listener();

    var get_scoreboard = function(){
        var scoreboard_cookie = document.getCookie("scan_me-scoreboard");
        if (scoreboard_cookie){
            return JSON.parse(document.getCookie("scan_me-scoreboard"));
        }
        return [];
    }

    var set_scoreboard = function(scoreboard){
        return document.setCookie("scan_me-scoreboard", JSON.stringify(scoreboard))
    }

    var clear_scoreboard = function(){
        set_scoreboard([{name: "satoshi", score: 100}]);
    }

    var add_to_scoreboard = function(player, score){
        var insertion_index;
        var scoreboard = get_scoreboard();

        insertion_index = 0;
        console.log(scoreboard);
        while (insertion_index < scoreboard.length && scoreboard[insertion_index]["score"] <= score){
            insertion_index++;
            console.log("ping");
        }
        scoreboard.splice(insertion_index, 0, {name: player, score: score});
        set_scoreboard(scoreboard.slice(0, max_scoreboard_size));
        show_scoreboard(score);
    }

    var max_topscore = function(){
        var scoreboard = get_scoreboard()
        return scoreboard[scoreboard.length -1]['score'];
    }

    var score_qualifies_for_topscore = function(score){
        return get_scoreboard().length < max_scoreboard_size || score < max_topscore();
    }

    var remove_all_barcodes = function(){
        while (game_barcodes.length > 0){
            game_barcodes.shift().remove();
        }
    }

    var show_scoreboard = function(score){
        remove_all_barcodes();
        document.getElementById("name_entry").style.display = "none";

        var main_header = document.getElementById("main_header")
        if (score){
            main_header.innerHTML = "Your score is: " + score + "s!";
        }
        else{
            main_header.innerHTML = "Welcome to SCAN_ME!";
        }

        var i;
        var scoreboard = get_scoreboard();
        score_tbody = document.createElement('tbody')
        for(i = 0; i < scoreboard.length; i++){
            var row = score_tbody.insertRow();
            row.insertCell().innerHTML = i + 1;
            row.insertCell().innerHTML = scoreboard[i]['name'];
            row.insertCell().innerHTML = scoreboard[i]['score'];
        }
        score_tbody.id = "score-tbody";
        old_score_tbody = document.getElementById("score-tbody");
        old_score_tbody.parentNode.replaceChild(score_tbody, old_score_tbody);

        document.getElementById("scoreboard").style.display = "block";

        reader.update_conditional_callback([
            {
                condition: get_text_from_barcode_id("start_game_barcode"),
                function: start_new_game
            },
            {
                condition: "reset_scores",
                function: clear_scoreboard
            },
            {
                condition: "reload_page",
                function: function(){location.reload(true);}
            }
        ]);
    }

    var random_string = function(length){
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;

        length = length || barcode_length

        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    var randomly_place_element = function(element){
        var new_angle = Math.random() * 360;
        element.style.transform = "rotate(" + new_angle + "deg)";

        var min_x = 0;
        var min_y = 0;
        var max_x = window.innerWidth; // - barcode_width;
        var max_y = window.innerHeight; // - barcode_height;
        var new_element_x = min_x + Math.random() * (max_x - min_x); 
        var new_element_y = min_y + Math.random() * (max_y - min_y);

        element.style.position = "fixed";
        element.style.left = new_element_x + 'px';
        element.style.top = new_element_y + 'px';

        element_box = element.getBoundingClientRect()
        //console.log("element is now at " + element.style.left + ", " +  element.style.top)
        //console.log(element_box)

        if (    element_box['top'] < min_y
                || element_box['bottom'] > max_y
                || element_box['left'] < min_x
                || element_box['right'] > max_x){
                    //console.log("Positioned element out of canvas. Retrying.")
                    randomly_place_element(element);
        }
    }

    var place_game_barcode = function(){
        // https://stackoverflow.com/questions/8215021/create-svg-tag-with-javascript
        var barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        barcode.className = "barcode";
        barcode.setAttribute("jsbarcode-value", random_string());
        barcode.setAttribute("jsbarcode-height", game_barcode_height);
        barcode.setAttribute("jsbarcode-width", game_barcode_width);
        barcode.style.position = "fixed";
        barcode.style.visibility = "hidden";
        JsBarcode(barcode).init();
        document.body.appendChild(barcode);
        randomly_place_element(barcode);


        return barcode;
        }
    
    var prepare_game_barcodes = function(number_of_barcodes){
        var i;
        var barcodes = [];
        number_of_barcodes = number_of_barcodes || barcodes_per_game;

        for (i = 0; i < number_of_barcodes; i++){
            barcodes.push(place_game_barcode());
        }

        return barcodes
    }

    var step_gameplay = function(first_step){
        if (game_barcodes.length > 1) {
            // Game continues ...
            if (! first_step){
                current_barcode = game_barcodes.shift();
                current_barcode.remove();
            }
            next_barcode = game_barcodes[0];
            reader.update_callback(function(input) {
                //console.log("Got: " + input);
                //console.log("Wanted: " + next_barcode.getAttribute("jsbarcode-value"));
                if (input === next_barcode.getAttribute("jsbarcode-value")){
                    step_gameplay(false);
                }
            });
            next_barcode.style.visibility = "visible";
        } else {
            var end_time = new Date();
            var time_diff = end_time - start_time;
            console.log("Elapsed time was: " + time_diff + " ms")
            process_score(time_diff / 1000);
        }
    }

    var process_score = function(score){
        if(score_qualifies_for_topscore(score)){
            console.log("new highscore!!");
            ask_for_user_name(function(name){
                add_to_scoreboard(name, score);
            }, score);
        } else {
            show_scoreboard(score);
        }
    }

    var get_text_from_barcode_id = function(barcode_id){
        barcode_element = document.getElementById(barcode_id);
        return barcode_element.getAttribute("jsbarcode-value");
    }

    var ask_for_user_name = function(callback, score){
        var default_name = "satoshi";
        console.log("Asking for the user's name");
        remove_all_barcodes();
        document.getElementById("scoreboard").style.display = "none";
        document.getElementById("name_entry").style.display = "block";
        document.getElementById("name_preview").innerHTML = "";
        document.getElementById("new_highscore").innerHTML = score;

        var fast_entry_names = generate_fast_name_entry_barcodes();

        reader.update_callback(function(){
            var char_buffer = "";

            return function(user_input){
                console.log("DBD " + user_input);
                //todo replace "done" with value obtained from DOM element
                if (user_input === get_text_from_barcode_id("name_entry_done_barcode")){
                    var name = char_buffer.slice(0, max_user_name_length);
                    name = name || default_name;
                    console.log("Got user name, doing callback | " + name);
                    callback(name)
                }
                if (user_input === get_text_from_barcode_id("name_entry_skip_barcode")){
                    console.log("Skipping user name entry");
                    callback(default_name);
                }
                else if (user_input === get_text_from_barcode_id("name_entry_backspace_barcode")){
                    char_buffer = char_buffer.slice(0, char_buffer.length - 1);
                    document.getElementById("name_preview").innerHTML = char_buffer;
                }
                else if (fast_entry_names.includes(user_input)) {
                    callback(user_input);
                }
                else if (user_input.length == 1){
                    char_buffer += user_input;
                    document.getElementById("name_preview").innerHTML = char_buffer;
                }
            }
        }())
    }

    var start_new_game = function(){
        document.getElementById("scoreboard").style.display = "none";
        document.getElementById("name_entry").style.display = "none";
        game_barcodes = prepare_game_barcodes();
        start_time = new Date();
        step_gameplay(true);
    }

    var generate_fast_name_entry_barcodes = function(){
        var fast_entry_barcode_height = 20;
        var fast_entry_names = [];
        var fast_entry_barcodes = [];
        var fast_entry_barcode_div = document.getElementById("fast_entry_barcodes");
        var scoreboard = get_scoreboard();

        var index, candidate_name, barcode;
        for (index = 0; index < scoreboard.length; index++){
            var candidate_name = scoreboard[index]['name']
            if (! fast_entry_names.includes(candidate_name)){
                fast_entry_names.push(candidate_name);
                barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                barcode.setAttribute("jsbarcode-value", candidate_name);
                barcode.setAttribute("jsbarcode-height", fast_entry_barcode_height);
                JsBarcode(barcode).init();
                fast_entry_barcodes.push(barcode);
            }
        }

        clear_columns(fast_entry_barcode_div);
        place_barcodes_in_columns(fast_entry_barcode_div, fast_entry_barcodes);

        return fast_entry_names;
    }

    var place_barcodes_in_columns = function(row_div, barcodes){
        var index;
        var columns = row_div.getElementsByClassName('barcode_column')
        
        for(index = 0; index < barcodes.length; index++){
            columns[index % columns.length].appendChild(barcodes[index]);
        }
    }

    var clear_columns = function(row_div){
        var columns = row_div.getElementsByClassName('barcode_column');
        var column;
        for (column of columns){
            while (column.firstChild) {
                column.removeChild(column.firstChild);
            }
        }
    }

    var generate_static_name_entry_barcodes = function(){
        var alphabet_barcode_height = 20;
        var alphabet = "abcdefghijklmnopqrstuvwxyz";

        var control_barcode_div = document.getElementById("control_barcodes");
        var alphabet_barcode_div = document.getElementById("alphabet_barcodes");
        
        // First create the control barcodes
        var control_barcodes = [];
        var barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        barcode.id = "name_entry_skip_barcode";
        barcode.setAttribute("jsbarcode-value", "Skip");
        JsBarcode(barcode).init();
        control_barcodes.push(barcode)

        barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        barcode.id = "name_entry_done_barcode";
        barcode.setAttribute("jsbarcode-value", "Done");
        JsBarcode(barcode).init();
        control_barcodes.push(barcode)

        barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        barcode.id = "name_entry_backspace_barcode";
        barcode.setAttribute("jsbarcode-value", "Backspace");
        JsBarcode(barcode).init();
        control_barcodes.push(barcode)

        place_barcodes_in_columns(control_barcode_div, control_barcodes);

        // Now generate the alphabet
        var alphabet_barcodes = [];
        var index;
        for (index = 0; index < alphabet.length; index++){
            barcode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            barcode.setAttribute("jsbarcode-value", alphabet[index]);
            barcode.setAttribute("jsbarcode-height", alphabet_barcode_height);
            barcode.style.display = 'block';
            JsBarcode(barcode).init();
            alphabet_barcodes.push(barcode)
        }
        place_barcodes_in_columns(alphabet_barcode_div, alphabet_barcodes);
    }

    return {
        init: function () {
            generate_static_name_entry_barcodes();
            JsBarcode("#start_game_barcode").init();
            show_scoreboard();
            //start_new_game();
        },
        clear_scores: clear_scoreboard
    }
}

function init_barcode_game(){
    console.log("hi!");
    JsBarcode("#start_game_barcode").init()

    game = barcode_game();
    //game.clear_scores()
    game.init();
}