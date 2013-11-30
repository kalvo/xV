
/**
 * Visalization framework
 *
 * @version 0.1
 * @author Raul Kalvo
 */
var xV = {};

/** Tiles */
xV.Tiles = {};

/**
 * @class Holds individual tile information and moves them around.
 *
 * @author Raul Kalvo
 *
 */



xV.Tiles.Tile = function(){

    this.long   = null; // double >> y
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
     * Retruns string
     * @param{string} type ["orto", "hybrid", "45N","45W", "45S", "45E", "street"]
     * @returns {string} URL Address
     */
    getBingAddress :  function (type){

        var address = "";

        switch (type){

            case "orto":

                address = "http://ecn.t" + this.qKey.substr(this.qKey.length-1, 1) + ".tiles.virtualearth.net/tiles/a" + this.qKey + ".jpeg?g=743&mkt=en-us&n=z";
                break;

            case "hybrid":

                address = "http://ecn.t" + this.qKey.substr(this.qKey.length-1, 1) + ".tiles.virtualearth.net/tiles/h" + this.qKey + ".jpeg?g=743&mkt=en-us&n=z";
                break;

            case "street":

                address ="http://ak.dynamic.t" + this.qKey.substr(this.qKey.length-1, 1) + ".tiles.virtualearth.net/comp/ch/" + this.qKey + "?mkt=en-us&it=G,VE,BX,L,LA&shading=hill&og=31&n=z";

            case "45N":

                address ="";

            default :

                address = "";
        }





        //

        return address
    },

    /**
     * @returns {{lat: (number|*), long: (number|*)}}
     */
    getTileUpperLeftLatLong : function () {

        mapSize = MapSize(this.z);
        x = (clip((this.x * this.tileWidht), 0, mapSize - 1) / mapSize) - 0.5;
        y = 0.5 - (clip((this.y*this.tileHeight), 0, mapSize - 1) / mapSize);

        latitude = 90 - 360 * Math.Atan(Math.Exp(-y * 2 * Math.PI)) / Math.PI;
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

         return Math.Min(Math.Max(n, minValue), maxValue);

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

  if (tileObject != null){

//      var tileObject = {
//
//          DB : "",
//          UpLeft : {
//              lat : 0,
//              long : 0
//          },
//          UpLeftAddress :  undefined,
//          BottomRight : {
//              lat : 0,
//              long : 0
//          },
//          BottomRightAddress : undefined,
//          Zoom : 0,
//          Coef : 1
//
//      }

      this.db = null;
      this.zoom = 1;
      this.coef = 1;

      this.UpLeftTile = null;
      this.BottomRightTile = null;


      if ("DB" in tileObject) {
          this.db = tileObject.db;
      }

      if ("Zoom" in tileObject) {
          this.zoom = tileObject.zoom;
      }

      if ("Coef" in tileObject) {

          this.coef = tileObject.coef;

      }

      if ("UpLeft" in tileObject && "Zoom" in tileObject) {

          this.UpLeftTile = new xV.Tiles.Tile();
          this.UpLeftTile.initByGeo(tileObject.UpLeft.lat, tileObject.UpLeft.long, this.zoom);

      }

      if ("UpLeftQKey" in tileObject) {

          this.BottomRightTile = new xV.Tiles.Tile();
          this.BottomRightTile.setQKey(tileObject.UpLeftQKey);

      }

      if ("BottomRight" in tileObject && "Zoom" in tileObject) {

          this.BottomRightTile = new xV.Tiles.Tile();
          this.BottomRightTile.initByGeo(tileObject.BottomRight.lat, tileObject.BottomRight.long, this.zoom);

      }

      if ("BottomRightQKey" in tileObject) {

          this.BottomRightTile = new xV.Tiles.Tile();
          this.BottomRightTile.setQKey( tileObject.BottomRightQKey)

      }

  }

}

xV.Tiles.Manager.prototype = {

  setZoom : function(zoom){

      this.zoom = zoom;
  },

  setDatabase :  function(db) {

      this.db =  db;

  },

  setConf : function(coef) {

      this.coef =  coef;

  },


  downLoadTiles : function(){

      // TODO

        // 1. Rebuild boundary




  }



}


// --------------


var tileObject = {

          DB : "database.db",
          UpLeft : {
              lat : 0,
              long : 0
          },
          UpLeftAddress :  undefined,
          BottomRight : {
              lat : 3,
              long : 4
          },
          BottomRightAddress : undefined,
          Zoom : 1,
          Coef : 1

      }



var tm = xV.Tiles.Manager(tileObject);
var t = new xV.Tiles.Tile();
//n.setQKeyByTile(3, 5, 3);

t.setTileByQKey("00");
t.moveRight(2);

console.log("tiles:");
console.log(t.x);
console.log(t.y);
console.log(t.z);



