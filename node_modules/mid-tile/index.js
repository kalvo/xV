var MBTiles = require('mbtiles'),
    sph = new (require('sphericalmercator'))(),
    queue = require('queue-async'),
    _ = require('lodash');

module.exports = build;

var defaultInfo = {
    name: 'Mid-Tile',
    description: '',
    version: '1.0.0',
    scheme: 'xyz',
    formatter: null,
    center: [ 0, 7.500000001278025, 2 ],
    minzoom: 0,
    maxzoom: 5,
    bounds: [-179, -69, 179, 84],
};

function pxTile(xy) {
    return [Math.floor(xy[0] / 256), Math.floor(xy[1] / 256)];
}

function build(name, meta, fn) {

    var tiles = [];

    _.extend(meta, defaultInfo);

    for (var z = meta.minzoom; z <= meta.maxzoom; z++) {
        var tl = pxTile(sph.px([meta.bounds[0], meta.bounds[1]], z));
        var br = pxTile(sph.px([meta.bounds[2], meta.bounds[3]], z));
        for (var x = tl[0]; x < br[0]; x++) {
            for (var y = br[1]; y < tl[1]; y++) {
                tiles.push([z, x, y]);
            }
        }
    }

    new MBTiles(name, function(err, mbtiles) {
        if (err) throw err;
        mbtiles.startWriting(function(err) {
            if (err) throw err;
            mbtiles.putInfo(meta, function(err) {
                if (err) throw err;
                var q = queue(1);
                tiles.forEach(function(t) { q.defer(fn, t, mbtiles); });
                q.awaitAll(function() {
                    console.log('all done');
                });
            });
        });
    });
}
