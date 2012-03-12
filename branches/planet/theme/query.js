
function ns(prefix) {
  if (prefix == 'atom') return 'http://www.w3.org/2005/Atom';
  if (prefix == 'xhtml') return 'http://www.w3.org/1999/xhtml';
  if (prefix == 'planet') return 'http://planet.intertwingly.net/';
  return null;
}

function xpath1(node, path) {
  return node.ownerDocument.evaluate(path, node, ns,
    XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function xpath(node, path) {
  return node.ownerDocument.evaluate(path, node, ns,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
}

function copyChildren(source, dest) {
  for (var i=0; i<source.childNodes.length; i++) {
    dest.appendChild(dest.ownerDocument.importNode(source.childNodes[i], true));
  }
}

var query = null;
document.waitmessage = null;
var subs = new Array()

function waitmessage(parent) {
  if (document.waitmessage) return;
  var span = document.createElement('span');
  span.style.backgroundColor='#F00';
  span.style.color='#FFF';
  span.appendChild(document.createTextNode('Please wait...'));
  parent.appendChild(span);
  document.getElementById('submit').disabled = true;
  document.waitmessage = span;
}

function fetch() {
  if (!query || (document.waitmessage &&
    window.pageYOffset+window.innerHeight*1.5 < document.waitmessage.offsetTop))
  {
    var submit = document.getElementById('submit');
    if (submit) submit.disabled = false;
    return setTimeout(fetch,500);
  }

  var results = document.getElementById('body');
  var xhtml = 'http://www.w3.org/1999/xhtml';
  var xhr =  new XMLHttpRequest();

  waitmessage(results);

  xhr.open("POST", "atom", true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState != 4) {return;}

    if (document.waitmessage) {
      results.removeChild(document.waitmessage);
      document.waitmessage = null;
    }

    var footer = document.getElementById('sidebar');
    footer = xpath1(footer, 'xhtml:ul');

    xhr.responseXML.normalize();
    var entries = xpath(xhr.responseXML.documentElement, 'atom:entry');
    var olddate = '';
    for (var entry=entries.iterateNext(); entry; entry=entries.iterateNext()) {
      var news = document.createElementNS(xhtml,'div');
      news.className = 'news';
      var head = document.createElement('h3');
      news.appendChild(head);

      var source = xpath1(entry, 'atom:source');
      var icon = xpath1(source, 'atom:icon');
      if (icon) {
        var img = document.createElement('img');
        img.src = icon.childNodes[0].nodeValue;
        img.className = 'icon';
        head.appendChild(img);
      }

      var name = xpath1(source, 'planet:name');
      if (!name) title = xpath1(source, 'atom:title');
      if (name) {
        var a = document.createElement('a');
        copyChildren(name,a);
        var link = xpath1(source, 'atom:link[@rel="alternate"]');
        if (link) a.href=link.getAttribute('href');
        head.appendChild(a);
        head.appendChild(document.createTextNode(' \u2014 '));
      }

      var a = document.createElement('a');
      var title = xpath1(entry, 'atom:title');
      if (title) copyChildren(title,a);
      var link = xpath1(entry, 'atom:link[@rel="alternate"]');
      if (link) a.href=link.getAttribute('href');
      head.appendChild(a);

      var content = xpath1(entry, 'atom:content');
      if (!content) content = xpath1(entry, 'atom:summary');
      if (content) {
        if (content.childNodes[0].nodeName == 'div') {
          content = content.childNodes[0];
        }
        var div = document.createElement('div');
        div.className = 'content';
        copyChildren(content,div);
        news.appendChild(div);
      }

      var permalink = document.createElement('div');
      permalink.className = 'permalink';
      var a = document.createElement('a');
      var link = xpath1(source, 'atom:link[@rel="alternate"]');
      if (link) a.href=link.getAttribute('href');
      if (name) {
        a.appendChild(document.createTextNode('by '));
        copyChildren(name,a);
      }
      var updated = xpath1(entry, 'atom:updated');
      if (updated) {
        a.appendChild(document.createTextNode(' at '));
        var date = document.createElement('time');
        date.setAttribute('title','GMT');
        date.setAttribute('datetime',updated.childNodes[0].nodeValue);
        if (updated.hasAttribute('planet:format')) {
          date.appendChild(document.createTextNode(
            updated.getAttribute('planet:format')));
        }
        a.appendChild(date);
      }
      permalink.appendChild(a);
      news.appendChild(permalink);

      results.appendChild(news);

      if (footer) {
        if (name) {
          name = name.childNodes[0].nodeValue;
          var prev = null;
          var node = null;
          for (var i=0; i<subs.length; i++) {
            if (subs[i][0] == name) {
              node = subs[i][1];
            } else if (subs[i][0] > name && 
              (prev == null || subs[prev][0] > subs[i][0])) {
              prev = i;
            }
          }
          if (!node) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.title = "subscribe";
            var feed = xpath1(source, 'atom:link[@rel="self"]');
            if (feed) a.href = feed.getAttribute('href');
            var img = document.createElement('img');
            img.src="images/feed-icon-10x10.png";
            img.title="(feed)";
            a.appendChild(img);
            li.appendChild(a);
            li.appendChild(document.createTextNode(' '));
            var a = document.createElement('a');
            if (link) a.href=link.getAttribute('href');
            a.appendChild(document.createTextNode(name));
            li.appendChild(a);
            if (prev == null) {
              footer.appendChild(li);
            } else {
              footer.insertBefore(li, subs[prev][1]);
            }
            li.appendChild(document.createElement('ul'));
            subs[subs.length] = new Array(name, node=li);
          }
          var ul = node.childNodes[node.childNodes.length-1];
          var li = document.createElement('li');
          var a = document.createElement('a');
          if (title) copyChildren(title,a);
          var link = xpath1(entry, 'atom:link[@rel="alternate"]');
          if (link) a.href=link.getAttribute('href');
          li.appendChild(a);
          ul.appendChild(li);
        }
      }
    }

    var bookmark = xpath1(xhr.responseXML.documentElement, 'planet:bookmark');
    query = '';
    if (bookmark) {
      for (var i=0; i<bookmark.attributes.length; i++) {
        var attr = bookmark.attributes[i];
        query += '&' + encodeURIComponent(attr.nodeName) + '=' +
          encodeURIComponent(attr.nodeValue);
      }
    }

    findEntries();
    moveDateHeaders();

    var stats = xpath1(xhr.responseXML.documentElement, 'planet:stats');
    if (stats) {
      if (stats.hasAttribute('scanned')) {
        var stat = document.getElementById('stats-scanned');
        if (stat) {
          stat.innerHTML = Math.floor(stat.innerHTML) +
            Math.floor(stats.getAttribute('scanned'));
        }
      }

      if (stats.hasAttribute('found')) {
        var stat = document.getElementById('stats-found');
        if (stat) {
          stat.innerHTML = Math.floor(stat.innerHTML) +
            Math.floor(stats.getAttribute('found'));
        }
      }

      if (stats.hasAttribute('date')) {
        var stat = document.getElementById('stats-date');
        if (stat) {
          stat.innerHTML = stats.getAttribute('date');
        }
      }
    }

    if (query.length) {
      query = query.slice(1,query.length);
      waitmessage(results);
    } else {
      query = null;
    }
    setTimeout(fetch,200);
  }
  xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
  xhr.send(query);
}
fetch();

function startQuery(textarea) {
  query = 'query=' + encodeURIComponent(textarea);

  var results = xpath(document.documentElement,
   '//xhtml:div[@class="news"] | //div[@class="news"] | //xhtml:h2[@class="date"]');
  trash = new Array();
  for (var node=results.iterateNext(); node; node=results.iterateNext()) {
    trash.push(node);
  }
  for (var i=0; i<subs.length; i++) {
    trash.push(subs[i][1]);
  }
  subs = new Array();
  for (var i=0; i<trash.length; i++) {
    trash[i].parentNode.removeChild(trash[i]);
  }

  document.getElementById('stats-scanned').innerHTML = '0';
  document.getElementById('stats-found').innerHTML = '0';
  // fetch();
}

if (document.addEventListener) {
  autoSearch = function() {
    if (document.location.search) {
      var args = document.location.search.substring(1).split('&');
      for (var i=0; i<args.length; i++) {
        var item = args[i].split('=',2);
        if (unescape(item[0]) == 'q') {
          value = decodeURIComponent(item[1]);
          value = value.replace('+',' ').replace(/\s+$/,'');
          if (value.length) {
            startQuery(document.forms['query'].q.value = value);
            break;
          }
        }
      }
    }
  };
  document.addEventListener("DOMContentLoaded", autoSearch, false);
}

