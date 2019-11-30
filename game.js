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
        update_conditional_callback: function(new_callback, condition){
            callback = function(user_input){
                if (user_input === condition){
                    new_callback(user_input);
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
    var barcode_length = 7;
    var barcodes_per_game = 2;
    var max_scoreboard_size = 10;
    var start_time;

    var reader = barcode_reader();
    reader.register_listener();

    var get_scoreboard = function(){
        return JSON.parse(document.getCookie("scan_me-scoreboard"));
    }

    var set_scoreboard = function(scoreboard){
        return document.setCookie("scan_me-scoreboard", JSON.stringify(scoreboard))
    }

    var add_to_scoreboard = function(player, score){
        var insertion_index;
        var scoreboard = get_scoreboard();

        insertion_index = 0;
        console.log(scoreboard);
        console.log(typeof scoreboard[insertion_index]["score"]);
        while (scoreboard[insertion_index]["score"] <= score && insertion_index <= scoreboard.length){
            insertion_index++;
            console.log("ping");
        }
        scoreboard.splice(insertion_index, 0, {name: player, score: score});
        set_scoreboard(scoreboard.slice(0, max_scoreboard_size));
    }

    var max_topscore = function(){
        var scoreboard = get_scoreboard()
        return scoreboard[scoreboard.length -1]['score'];
    }

    var score_qualifies_for_topscore = function(score){
        return score < max_topscore() || get_scoreboard().length < max_scoreboard_size;
    }

    var remove_all_barcodes = function(){
        while (game_barcodes.length > 0){
            game_barcodes.shift().remove();
        }
    }

    var show_scoreboard = function(score){
        remove_all_barcodes();

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
            row.insertCell().innerHTML = scoreboard[i]['name'];
            row.insertCell().innerHTML = scoreboard[i]['score'];
        }
        score_tbody.id = "score-tbody";
        old_score_tbody = document.getElementById("score-tbody");
        old_score_tbody.parentNode.replaceChild(score_tbody, old_score_tbody);

        document.getElementById("scoreboard").style.display = "block";

        reader.update_conditional_callback(
            start_new_game,
            document.getElementById("start_game_barcode").getAttribute("jsbarcode-value")
        );
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
        barcode.setAttribute("jsbarcode-value", random_string())
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
            add_to_scoreboard("piet", score);
        }
        show_scoreboard(score);
    }

    var start_new_game = function(){
        document.getElementById("scoreboard").style.display = "none";
        game_barcodes = prepare_game_barcodes();
        start_time = new Date();
        step_gameplay(true);
    }



    return {
        init: function () {
            JsBarcode("#start_game_barcode").init();
            show_scoreboard();
            //start_new_game();
        },
        set_scores: set_scoreboard,
        get_score: get_scoreboard
    }
}

function init_barcode_game(){
    console.log("hi!");
    JsBarcode("#start_game_barcode").init()

    game = barcode_game();
    game.set_scores([{name: "piet", score: 1}, {name: "ladina", score: 2}])
    game.init();
}