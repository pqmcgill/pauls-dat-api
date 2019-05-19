const test = require('ava')
const hyperdrive = require('hyperdrive')
const tutil = require('./util')
const pda = require('../index')

async function contentEvent (archive) {
  return new Promise(resolve => {
    archive.on('content', resolve)
  })
}


test('watch local', async t => {
  var archive
  var changes
  var invalidates
  var stream
  var done

  // no pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.watch(archive)

  done = new Promise(resolve => {
    invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(args.path, changes.shift())
      }
      if (invalidates.length === 0 && changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done

  // simple pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.watch(archive, '/a.txt')

  done = new Promise(resolve => {
    changes = ['/a.txt', '/a.txt', '/a.txt']
    invalidates = ['/a.txt', '/a.txt', '/a.txt']
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(args.path, changes.shift())
      }
      if (invalidates.length === 0 && changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done

  // complex pattern
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.watch(archive, ['/a.txt', '/c.txt'])

  done = new Promise(resolve => {
    changes = ['/a.txt', '/a.txt', '/a.txt', '/c.txt']
    invalidates = ['/a.txt', '/a.txt', '/a.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(args.path, changes.shift())
      }
      if (invalidates.length === 0 && changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done

  // glob
  // =

  archive = await tutil.createArchive()
  await new Promise(resolve => archive.ready(resolve))
  stream = pda.watch(archive, '/*.txt')

  done = new Promise(resolve => {
    changes = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(args.path, changes.shift())
      }
      if (invalidates.length === 0 && changes.length === 0) resolve()
    })
  })

  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'one', 'utf8')
  await pda.writeFile(archive, '/a.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/b.txt', 'two', 'utf8')
  await pda.writeFile(archive, '/c.txt', 'one', 'utf8')
  await done
})

test('watch remote sparse', async t => {
  // no pattern
  // =

  var done
  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: true})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  var stream = pda.watch(dst)

  // invalidation phase

  var invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt']
  var changes = ['/a.txt', '/c.txt', '/b.txt']
  done = new Promise(resolve => {
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        t.deepEqual(args.path, changes.shift())
      }
      if (changes.length === 0 && invalidates.length === 0) resolve()
    })
  })

  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'b.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'two', 'utf8')
  await pda.writeFile(src, 'b.txt', 'two', 'utf8')
  await pda.writeFile(src, 'c.txt', 'one', 'utf8')

  // wait 100ms to let metadata sync
  await new Promise(resolve => setTimeout(resolve, 100))

  await pda.download(dst, 'a.txt')
  await pda.download(dst, 'c.txt')
  await pda.download(dst, 'b.txt')

  await done
})

test('watch remote non-sparse', async t => {
  // no pattern
  // =

  var done
  const src = await tutil.createArchive()
  await new Promise(resolve => src.ready(resolve))
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: false})
  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)
  await contentEvent(dst)

  var stream = pda.watch(dst)

  // invalidation phase

  var done = new Promise(resolve => {
    var invalidates = ['/a.txt', '/b.txt', '/a.txt', '/a.txt', '/b.txt', '/c.txt', '/a.txt']
    var changes = ['/a.txt', '/b.txt', '/c.txt', '/a.txt']
    stream.on('data', ([event, args]) => {
      if (event === 'invalidated') {
        t.deepEqual(args.path, invalidates.shift())
      } else if (event === 'changed') {
        changes.splice(changes.indexOf(args.path), 1)
      }
      if (invalidates.length === 0 && changes.length === 0) {
        resolve()
      }
    })
  })

  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'b.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'one', 'utf8')
  await pda.writeFile(src, 'a.txt', 'two', 'utf8')
  await pda.writeFile(src, 'b.txt', 'two', 'utf8')
  await pda.writeFile(src, 'c.txt', 'one', 'utf8')
  await pda.unlink(src, 'a.txt')
  await done
})

test('createNetworkActivityStream', async t => {
  const src = await tutil.createArchive([
    'foo.txt',
    { name: 'bar.data', content: Buffer.from([0x00, 0x01]) },
    'bar.txt'
  ])
  const dst = hyperdrive(tutil.tmpdir(), src.key, {sparse: false})

  var done = new Promise(resolve => {
    var stream = pda.createNetworkActivityStream(dst)
    var gotPeer = false
    var stats = {
      metadata: {
        down: 0,
        synced: false
      },
      content: {
        down: 0,
        synced: false
      }
    }
    stream.on('data', ([event, args]) => {
      if (event === 'network-changed') {
        gotPeer = true
      } else if (event === 'download') {
        stats[args.feed].down++
      } else if (event === 'sync') {
        stats[args.feed].synced = true
      }
      if (gotPeer &&
        stats.metadata.down === 4 && stats.metadata.synced &&
        stats.content.down === 3 && stats.content.synced) {
        resolve()
      }
    })
  })

  const srcRS = src.replicate({live: true})
  const dstRS = dst.replicate({live: true})
  srcRS.pipe(dstRS).pipe(srcRS)

  await done
})
