steem.api.setOptions({ url: "https://api.steemitdev.com" });
const client = new dsteem.Client('https://api.steemitdev.com');
let simplemde;
// Checking if the already exists
async function checkAccountName(username) {
  const ac = await client.database.call('lookup_account_names', [[username]]);
  return (ac[0] === null) ? false : true;
}

function getPosts(username) {
  return new Promise((resolve, reject) => {
    let posts = [];
    steem.api.getDiscussionsByBlog({ tag: username, limit: 100 }, async function (err, blogs) {
      if (blogs && !err) {
        for (let blog of blogs) {
          if (blog.author === username) {
            posts.push(blog);
          }
        }
        resolve(posts);
      }
    });
  });
}

async function generatePostTemplate(selected) {
  let permlink = selected.value;
  let username = $('#username').val().trim();
  let htmlString = '';
  $('#post').html('');
  let post = document.getElementById('post');
  let blog = await getContent(username, permlink);
  let tags = JSON.parse(blog.json_metadata).tags.toString();
  if (blog) {
    htmlString = `
<div class="form-group">
        <input type="text" class="form-control" id="title" value='${blog.title}'>
      </div>
      <div class="form-group">
  <textarea id="body" value='${blog.body}'></textarea></div>
  <div class="form-check">
    <input type="checkbox" class="form-check-input" id="isHivecn">
    <label class="form-check-label">Post to HIVE CN Community</label>
  </div>
  <div class="form-check">
  <input type="checkbox" class="form-check-input" id="steem2hive">
  <label class="form-check-label">Share 1% of this post rewards with @steem2hive</label>
</div>
  <br/>
  <div class="form-group">
  <input type="text" class="form-control" id="tags" value='${tags}'>
  </div>

  
  <!-- Button trigger modal -->
  <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#login">
      Submit
    </button>
    
    <!-- Modal -->
    <div class="modal fade" id="login" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exampleModalLabel">Post to HIVE</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
          <div id="message"></div>
          <form>
  <div class="input-group mb-3">
  <div class="input-group-prepend">
    <span class="input-group-text" id="basic-addon1">@</span>
  </div>
  <input type="text" class="form-control" placeholder="HIVE ID" id="hiveid" required>
</div>
  <div class="form-group">
    <input type="password" class="form-control" id="postingKey" placeholder="Posting Key">
    <p class="text-muted small mt-1">Leave this field blank to use Hive Keychain.</p>
  </div>
  <button type="button" class="btn btn-primary" onclick="postToHive(this)">Post</button> 
</form>
          </div>
        
        </div>
      </div>
    </div>
  
  </div>`
    post.innerHTML += htmlString;
  }
  simplemde = new SimpleMDE({ element: document.getElementById("body"), initialValue: blog.body, });

}

function getContent(username, permlink) {
  return new Promise((resolve, reject) => {
    steem.api.getContent(username, permlink, function (err, result) {
      if (!err && result) {
        resolve(result);
      }
    });
  });
}

async function postToHive() {
  const hiveid = document.getElementById("hiveid").value;
  const postingKey = document.getElementById("postingKey").value;
  const isHivecn = document.getElementById("isHivecn").checked;
  const steem2hive = document.getElementById("steem2hive").checked;
  const title = $('#title').val();
  const tags = $('#tags').val();
  const tagsList = tags.split(',');
  const body = simplemde.value();
  let category = tagsList[0];
  const json_metadata = JSON.stringify({ tags: tagsList });
  let permlink = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  if (isHivecn) {
    category = 'hive-105017';
  }
  let beneficiaries = [];
  if (steem2hive) {
    beneficiaries.push({ account: "steem2hive", weight: 100 });
  }
  if (window.hive_keychain && postingKey==='') {
    let comment_options = JSON.stringify({
      author: hiveid,
      permlink,
      max_accepted_payout: '1000000.000 SBD',
      percent_steem_dollars: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [
        [0, {
          beneficiaries: beneficiaries
        }]
      ]
    });
    hive_keychain.requestPost(hiveid, title, body, category, '', json_metadata, permlink, comment_options, function (response) {
      if (response.success) {
        $('#message').html(`<div class="alert alert-success" role="alert">
        Post has been published! <a href="https://hive.blog/@${author}/${permlink}">Click here to view the post</a>
      </div>`);
      } else {
        $('#message').html(`<div class="alert alert-danger" role="alert">
            ${response.message}
          </div>`);
      }
    });
  } else {
    post(title, body, category, tagsList,beneficiaries, hiveid, postingKey)
  }
}

function post(title, content, category, tagsList, beneficiaries,author, postingKey) {
  let permlink = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();

  var operations = [
    ['comment',
      {
        parent_author: '',
        parent_permlink: category,
        author: author,
        permlink: permlink,
        title: title,
        body: body,
        json_metadata: JSON.stringify({
          tags: tagsList,
          app: 'steemcn/0.2'
        })
      }
    ],
    ['comment_options', {
      author: author,
      permlink: permlink,
      max_accepted_payout: '100000.000 SBD',
      percent_steem_dollars: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [
        [0, {
          beneficiaries: beneficiaries
        }]
      ]
    }]
  ];
  hive.broadcast.send(
    { operations: operations, extensions: [] },
    { posting: postingKey },
    function (err, result) {
      if (err) {
        $('#message').html(`<div class="alert alert-danger" role="alert">
            ${err}
          </div>`);
      } else {
        $('#message').html(`<div class="alert alert-success" role="alert">
            Post has been published! <a href="https://hive.blog/@${author}/${permlink}">Click here to view the post</a>
          </div>`);
      }

    });
}

function formatDate(date) {
  let d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}


$(document).ready(async function () {
  $('#username').on('input', async function () {
    const username = $(this).val();
    let isValid = await checkAccountName(username);
    let htmlString = '';
    if (isValid) {
      let posts = await getPosts(username);
      $('#selection').html('<option selected>Please Select a Post</option>');
      for (let post of posts) {
        let date = formatDate(post.created + "Z");

        htmlString += `<option value="${post.permlink}">【${date}】${post.title}</option>`;
      }
      selection.innerHTML += htmlString;
    }

  })

});