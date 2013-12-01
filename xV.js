
/**
 * Visalization framework
 *
 * @version 0.1
 * @author Raul Kalvo
 */


    var _fs = require('fs');
    var _request = require('request').defaults({encoding: null });
    var _MBTiles =  require('mid-tile');

    var _sql  = require('sqlite3').verbose();

    var _mb = require('mbtiles');
    var _queue = require('queue-async');

    var _bf = require('buffer').Buffer;



// ----------------------------------------------------------------------

var xV = {};
/** Tiles */
xV.Tiles = {};

/**
 * @class Holds individual tile information and moves them around.
 * @author Raul Kalvo
 *
 */
xV.Tiles.Tile = function(){

    this.long   = null; // {number:double << this.y}
    this.lat    = null; // double >> x
    this.x      = null; // int >> lat
    this.y      = null; // int >> long
    this.z      = null; // int // zoom level
    this.qKey   = null; // int

    this.tileHeight = 256; // px
    this.tileWidht =  256; // px

    // CONSTANTS

    this.EarthRadius = 6378137;
    this.MinLatitude = -85.05112878;
    this.MaxLatitude = 85.05112878;
    this.MinLongitude = -180;
    this.MaxLongitude = 180;

}

xV.Tiles.Tile.prototype = {


    /**
     *Builds tile parameters and quadKey from lat, long and zoom level
     *
     * @param {number:double} lat Degrees between -180 to 1800
     * @param {number:double} long Degrees between -90 to 90
     * @param {number:int} zoom Levels between 1 and  24 (theoretical)
     */
    initByGeo: function(lat, long, zoom){

        // lat = [-90 to 90] degrees
        // long = [-180 to 180] degrees

        this.lat        = lat;
        this.long       = long;

        sinLatitude = Math.sin(lat * Math.PI/180);

        var pxx =  ((long  + 180)/360) * this.tileWidht * Math.pow(2, zoom);
        var pxy =  (0.5 - Math.log(( 1 - sinLatitude )  / (1-sinLatitude)) / (4  * Math.PI)) * this.tileHeight * Math.pow(2, zoom);

        this.x = Math.floor(pxx / this.tileWidht);
        this.y = Math.floor(pxy / this.tileHeight);

        this.setQKeyByTile(this.x, this.y, this.z);


    },

    /**
     * Sets QKey.
     * Note that Geo coords., zoom, tile parameters are not calculated
     * @param QKey
     */
    setQKey : function(QKey){

        this.qKey = QKey;

    },

    /**
     * Sets QuadKey from tile index
     *
     * @param {number:int} x Tile parameter in left-right order. Range from o to 2^z-1
     * @param {number:int} y Tile parameter in top-down order. Range from 0 to 2^z-1
     * @param {number:int} z Zoom level. Range from 1 to n
     */
    setQKeyByTile : function(x, y, z){

        quadKey  = [];

        for (i = z; i > 0; i--)
        {

            digit = '0';
            mask = 1 << (i - 1);
            if ((x & mask) != 0)
            {
                digit++;
            }
            if ((y & mask) != 0)
            {
                digit++;
                digit++;
            }

            quadKey.push(digit);

        }

        this.qKey = quadKey.join("");


    },

    /**
     * Set tile parameters from QuadKey
     * @param qKey
     */
    setTileByQKey : function(qKey){

        this.x = 0;
        this.y = 0;
        this.z =  qKey.length;
        this.qKey = qKey;

        for (var i = this.z; i > 0; i--){

            var mask = 1 << (i-1);
            var s = qKey.substr(this.z - i, 1);

            switch (s){

                case "0":
                    break;

                case "1":
                    this.x |= mask;
                    break;

                case "2":
                    this.y |= mask;
                    break;

                case "3":
                    this.x |= mask;
                    this.y |= mask;
                    break;

                default:
                    console.log("can not convert QuadKey " + qKey + " to Tiles");

            }


        }

    },

    /**
     * Sets lat and long parameter.
     * @param lat
     * @param long
     */
    setLatLong : function(lat, long) {

        this.lat =  lat;
        this.long =  long;

    },

    /**
     * Retruns string
     * @param{string} type ["orto", "hybrid", "45N","45W", "45S", "45E", "street"]
     * @returns {string} URL Address
     */
    getBingAddress :  function (type){

        var address = "";

        var t = this.qKey.substr(this.qKey.length-1, 1);

        switch (type){

            case "orto":

                address = "http://ecn.t" + t + ".tiles.virtualearth.net/tiles/a" + this.qKey + ".jpeg?g=743&mkt=en-us&n=z";
                break;

            case "hybrid":

                address = "http://ecn.t" + t + ".tiles.virtualearth.net/tiles/h" + this.qKey + ".jpeg?g=743&mkt=en-us&n=z";
                break;

            case "street":

                address ="http://ak.dynamic.t" + t + ".tiles.virtualearth.net/comp/ch/" + this.qKey + "?mkt=en-us&it=G,VE,BX,L,LA&shading=hill&og=31&n=z";
                break;

            case "45N":

//                if (this.qKey.length != 17) console.log(" 45Degree works nicely only with level 17 ");

                // 123456789 1234567
                // 03201011013021130
                // 03201011013003312

                address ="http://ak.t" + t  +".tiles.virtualearth.net/tiles/svi" + this.qKey + "?g=2135&dir=dir_n&n=z";
                break;

            case "45W":

                address ="http://ak.t" + t  +".tiles.virtualearth.net/tiles/svi" + this.qKey + "?g=2135&dir=dir_w&n=z";
                break;

            case "45E":

                address ="http://ak.t" + t  +".tiles.virtualearth.net/tiles/svi" + this.qKey + "?g=2135&dir=dir_e&n=z";
                break;

            case "45S":

                address ="http://ak.t" + t  +".tiles.virtualearth.net/tiles/svi" + this.qKey + "?g=2135&dir=dir_s&n=z";
                break;

            default :

                address = "";
        }

        return address
    },

    /**
     * @returns {{lat: (number|*), long: (number|*)}}
     */
    getTileUpperLeftLatLong : function () {

        mapSize = this.mapSize(this.z);
        x = (this.clip((this.x * this.tileWidht), 0, mapSize - 1) / mapSize) - 0.5;
        y = 0.5 - (this.clip((this.y*this.tileHeight), 0, mapSize - 1) / mapSize);

        latitude = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
        longitude = 360 * x;

        return { lat: latitude, long: longitude  }

    },

    getTileLowerRightLatLong : function () {

        mapSize = this.mapSize(this.z);
        x = (this.clip(((this.x +1) * this.tileWidht), 0, mapSize) / mapSize) - 0.5;
        y = 0.5 - (this.clip(((this.y+1)*this.tileHeight), 0, mapSize) / mapSize);


        latitude = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
        longitude = 360 * x;

        return { lat: latitude, long: longitude  }

    },

    /**
     * Shift tile parameter from left to right
     * @param {number:int} units Positive number moves from left to right. Negative from right to left
     */
    moveRight : function(units) {

        this.x = this.x + units;
        if (this.x < 0){
            this.x =  0;
        }
        mx = Math.pow(2, this.z)-1;
        if (this.x > mx){
            this.x = mx;
        }

        this.setQKeyByTile(this.x, this.y, this.z);


    },

    /**
     * Shift tile parameter from top to down
     * @param {number:int} units Positive number moves from top to down. Negative from down to top
     */
    moveDown : function(units) {

        this.y = this.y + units;
        if (this.y < 0){
            this.y =  0;
        }
        mx = Math.pow(2, this.z)-1;
        if (this.y > mx){
            this.y = mx;
        }

        this.setQKeyByTile(this.x, this.y, this.z);

    },

    clip : function(n, minValue, maxValue){

         return Math.min(Math.max(n, minValue), maxValue);

    },

    mapSize : function(levelOfDetail){

            return  256 << levelOfDetail;
    }


}

/**
 * @class This class is managing all tiles.
 * @author Raul Kalvo
 * @param object = {
 * DB : database address,
 * zoom : zoom level,
 * conf? : 0.0 to 1.0. If returning image then what is that size,
 * UpLeft : (lat, long),
 * BottomRight : (lat, long),
 *
 * }
 */
xV.Tiles.Manager = function( tileObject ){

    /**tileObject
     *

     DB : {string:path},
     Project : {string},
     UpLeft : {
              lat : {number:double},
              long : {number:double}
          },
     UpLeftAddress :  {string:quad decimal},
     BottomRight : {
              lat : {number:double},
              long : {number:double}
          },
     BottomRightAddress : {string:quad decimal},
     Zoom : {number:int in range of 1 to n},
     Coef : {number:double in range 1 to 0}

     }

     */

    // Global variables

    this.db = null;
    this.zoom = 1;
    this.coef = 1;

    this.UpLeftTile = null;
    this.BottomRightTile = null;

    this.dbBound = null;
    this.downloadBound = null;

    this.project = "untitled";

    this.tileType = "orto";
    this.tileHeight = 256;
    this.tileWidth = 256;

    this.isReady = false;

    this.isDone  = true;

    this.hasBoundary = false;
    this.hasDatabase = false;

    this.databaseBoundary = null;
    this.tileBoundary = null;

    // Closers

    if (tileObject != null) {

        d = tileObject;

        if ("DB" in d) this.db = d.db;
        if ("Proejct" in d) this.project = d.Project;
        if ("Zoom" in d) this.zoom = d.zoom;
        if ("Coef" in d) this.coef = d.coef;


        if ("UpLeft" in d && "Zoom" in d) {

            this.UpLeftTile = new xV.Tiles.Tile();
            this.UpLeftTile.initByGeo(d.UpLeft.lat, d.UpLeft.long, this.zoom);

        }

        if ("UpLeftAddress" in d) {

            this.UpLeftTile = new xV.Tiles.Tile();
            this.UpLeftTile.setTileByQKey(d.UpLeftAddress);

        }

        if ("BottomRight" in d && "Zoom" in d) {

            this.BottomRightTile = new xV.Tiles.Tile();
            this.BottomRightTile.initByGeo(d.BottomRight.lat, d.BottomRight.long, this.zoom);

        }

        if ("BottomRightAddress" in d) {

            this.BottomRightTile = new xV.Tiles.Tile();
            this.BottomRightTile.setTileByQKey( d.BottomRightAddress)

        }

        if ("TileType" in d) this.tileType = d.TileType;
        if ("TileHeight" in d) this.tileHeight = d.TileHeight;
        if ("TileWidth" in d) this.tileWidth = d.TileWidth;

    }



}

xV.Tiles.Manager.prototype = {

    setZoom : function(zoom){

      this.zoom = zoom;
    },

    setDatabase :  function(db) {

      this.db =  db;

    },

    setProject : function(project_name){

        this.project = project_name;

    },

    setConf : function(coef) {

      this.coef =  coef;

    },

    setUpLeftTileByLatLong : function( lat, long ) {

      this.UpLeftTile = new xV.Tiles.Tile();
      this.UpLeftTile.initByGeo(lat, long, this.zoom);

    },

    setBottomRightTileByLatLong : function( lat, long ) {

        this.BottomRightTile = new xV.Tiles.Tile();
        this.BottomRightTile.initByGeo(lat, long, this.zoom);

    },

    downloadTiles : function(){


        if (!this.isReady) {
            console.log("@TileManager.downloadTiles : There are missing parameters can not get tiles");
            return;

        }

        if (this.isDone) {
            return;
        }

        if (!this.hasBoundary) {

            UBound = this.UpLeftTile.getTileUpperLeftLatLong();
            BBound = this.BottomRightTile.getTileLowerRightLatLong();

            this.tileBoundary = [ UBound.long, UBound.lat, BBound.long, BBound.lat  ];

            fs.exists(this.db, function(exists) {
                if (exists) {

                    this.hasDatabase = true;

                    // get bounds.

                    db = new _sql.Database(this.db);
                    db.each( "SELECT name, value FROM metadata", function(err, row) {

                       if (row.name === "bounds"){

                           var S = row.value.split(",");
                           var N = [];

                           var i = S.length;
                           while (i > 0)
                           {
                               i--;
                               console.log(S[i]);
                               N.push( parseFloat(S[i]) );
                           }

                           this.databaseBoundary = N;

                           // rebuild boundary;

                           this.databaseBoundary = [
                               Math.min( this.databaseBoundary[0], this.tileBoundary[0]),
                               Math.min (this.databaseBoundary[1], this.tileBoundary[1]),
                               Math.max( this.databaseBoundary[2], this.tileBoundary[2]),
                               Math.max( this.databaseBoundary[3], this.tileBoundary[3])
                           ];

                           this.hasBoundary = true;

                       }

                        this.downloadTiles();

                    });

                    db.close();

                } else {

                    this.hasDatabase = false;
                    this.databaseBoundary = this.tileBoundary;
                    this.hasBoundary = true;

                    this.downloadTiles();


                }
            });

        }

        if (this.hasBoundary) {

            if (this.hasDatabase){

                // there is file so i try to get file.

                _MBTiles(this.db, {
                    name: this.project,
                    bounds: this.databaseBoundary
                }, function(xyz, mbtiles, cb) {




                    mbtiles.putTile(
                        z, x, y,
                        buf, function(err) {
                            cb();
                        });


                });


            } else {



            }





        }









    },


  writeBufferToFile : function(filename, buf){

      _fs.writeBufferToFile(filename, buf);

  },

  writeBufferToDB :  function (filename, buf, z, x, y){

//    _MBTiles(filename, {
//        name: 'Generic Name',
//        bounds: [-179, -80, 179, 80]
//    }, function(xyz, mbtiles, cb) {
//        mbtiles.putTile(
//            z, x, y,
//            buf, function(err) {
//                cb();
//            });
//    });

},

    getBufferFromDB :  function(database, z, x, y , filename ){

//        _MBTiles(database, {
//            name: 'Generic Name',
//            bounds: [-179, -80, 179, 80]
//        }, function(xyz, mbtiles, cb) {
//
//            mbtiles.getTile( z,x,y, function (err, grid, headers){
//
//                if (err === null){
//
//                    writeBufferToFile(filename, grid);
//                } else {
//                    console.log(err)
//                }
//
//            } );
//
//        });

    },

    testFiles : function( jobs ){

        UBound = this.UpLeftTile.getTileUpperLeftLatLong();
        BBound = this.BottomRightTile.getTileLowerRightLatLong();

        this.tileBoundary = [ UBound.long, UBound.lat, BBound.long, BBound.lat  ];

       for (var i = 0; i < jobs.length; i++){

           var mb = new _MBTiles( this.db, { name : this.project, bounds: this.tileBoundary } )


       }

    },

    tryToGetReady : function(){

        this.isReady = true;

        if (this.db === null){
            isReady = false;
            console.log("@TileMangager: no database");

        }
        if (this.UpLeftTile === null) {
            isReady = false;
            console.log("@TileMangager: no UpLeftTile");
        }
        if (this.BottomRightTile === null) {
            isReady = false;
            console.log("@TileMangager: no BottomRight");
        }


    },

    createJobs : function(){

        jobs = [];

        for (var x = this.UpLeftTile.x; x <= this.BottomRightTile.x; x++ ) {

            for (var y = this.UpLeftTile.y; y <= this.BottomRightTile.y; y++) {

                var tile =  new xV.Tiles.Tile();
                tile.setQKeyByTile( x, y, this.UpLeftTile.z );

                jobs.push( {name : tile.qKey, bing : tile.getBingAddress(this.tileType), tileX : x, tileY : y,  indb : false});

            }
        }

//    console.log( this.jobs);

    return jobs

    },

    createComposer : function(file_name){

        var jobs = [];

        info = {
            xMax :  this.BottomRightTile.x - this.UpLeftTile.x + 1,
            yMax :  this.BottomRightTile.y - this.UpLeftTile.y + 1,
            height : this.tileHeight,
            width : this.tileWidth,
            coef : 1
        }

        jobs.push(info)

        for (var x = this.UpLeftTile.x; x <= this.BottomRightTile.x; x++ ) {

            for (var y = this.UpLeftTile.y; y <= this.BottomRightTile.y; y++) {

                var tile =  new xV.Tiles.Tile();
                tile.setQKeyByTile( x, y, this.UpLeftTile.z );

                jobs.push( {name : tile.qKey + ".jpg", tileX : x - this.UpLeftTile.x, tileY : y - this.UpLeftTile.y });

            }
        }

        var s = JSON.stringify(jobs);
        if (typeof(file_name)!='undefined'){
            _fs.writeFile(  file_name, s);
        }

        return s;



    },

    getMBTileInfo : function() {

        if (!this.isReady) {
            return;
        }

        UBound = this.UpLeftTile.getTileUpperLeftLatLong();
        BBound = this.BottomRightTile.getTileLowerRightLatLong();

        this.tileBoundary = [ UBound.long, UBound.lat, BBound.long, BBound.lat  ];

        o = {

            name :  this.project,
            description : '',
            version: '1.0.0',
            scheme: 'xyz',
            formatter: null,
            center: [ 0, 0, this.zoom ],
            minzoom: 0,
            maxzoom: this.zoom,
            bounds: this.tileBoundary
        }

        return o;

    }

}





// --------------

var tileObject = {

          DB : "database.db",
          Project : "world",
          UpLeft : {
              lat : -90,
              long : -180
          },
          UpLeftAddress :  undefined,
          BottomRight : {
              lat : 3,
              long : 4
          },
          BottomRightAddress : undefined,
          Zoom : 2,
          Coef : 1

      }

var world = {

    DB : "world.db",
    Project : "World",
    UpLeftAddress: "0000",
    BottomRightAddress: "3333",
    Zoom : 4,
    Coef :1

}

var ny = {

    DB : "ny.db",
    Project : "New York",
    UpLeftAddress: "03201011013003312",
    BottomRightAddress: "03201011120003012",
    Zoom : 17,
    Coef :1


}

var ny20x40 = {

    DB : "ny.db",
    Project : "New York",
    UpLeftAddress: "03201011012311202",
    BottomRightAddress: "03201011031003302",
    Zoom : 17,
    Coef :1,
    TileType : "45N",
    TileHeight: 180,
    TileWidth: 256


}


var working_with_tile = function(){

    var t1 = new xV.Tiles.Tile();
    t1.setTileByQKey("03201011012311202");
    t1.moveRight(20);
    t1.moveDown(40);

    console.log(t1.qKey);

}

var working_with_files= function( tile_setup, doDownload ){

    var m = new xV.Tiles.Manager(tile_setup);
    m.tryToGetReady();
    m.createComposer("tiles.json");

    jobs  = m.createJobs();

    console.log(jobs);

    var downloadData = function(url, fn){

        _request(url, function(err, res, buf){

            writeBufferToFile(fn, buf);

        });

    }

    function writeBufferToFile(fn, buf){
        _fs.writeFile(fn, buf);
    }

    var q = _queue(jobs.length);

    jobs.forEach(function(job) {

        //console.log("name:" + job.name );
        if (doDownload) {
        q.defer( downloadData, job.bing, job.name + ".jpg" );
        }

    });




    console.log("Done");




//    tileInfo = m.getMBTileInfo();
//    console.log(tileInfo);

//_M = new _mb(m.db, function(err, mbtiles) {
//    if (err) throw  err;
//
//    mbtiles.startWriting(function(err){
//        if (err) throw  err;
//
//        mbtiles.putInfo(tileInfo, function(err){
//            if (err) throw  err;
//
//            var q = _queue(1);
//            jobs.forEach(  function(t) {q.defer(  ) }  )
//
//
//
//        });
//
//
//    });
//
//
//});



}

//working_with_tile();

working_with_files( ny20x40, true );










//var t = new xV.Tiles.Tile();
//
//t.setTileByQKey("00");
//
////t.moveRight(2);
////console.log("tiles:");
//
//console.log(t.x);
//console.log(t.y);
//console.log(t.z);
//



// init Tiles
// init database.
// if database existes rebuild Boundary
// download Tile if it is not in db
// if Tile in database get Tile as buffer
// if tile is not in database download Tile and keep it in memory
//
// if requeted put tile to canvas




