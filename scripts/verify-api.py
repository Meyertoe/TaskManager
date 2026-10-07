"""Kontrollerar API:t mot en separat, lokalt startad backend."""
import json
import sys
import urllib.error
import urllib.request
import uuid

base_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5219'


def request(method, path, body=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base_url + path, data=data, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.code
        content = response.read()
    assert status == expected, f'{method} {path}: expected {expected}, got {status}'
    return json.loads(content) if content else None


for method, path, body in [
    ('GET', '/api/tasks', None),
    ('POST', '/api/tasks', {'title': 'unauthorized'}),
    ('PUT', '/api/tasks/1', {'title': 'unauthorized'}),
    ('DELETE', '/api/tasks/1', None),
]:
    request(method, path, body, expected=401)
request('GET', '/api/tasks', token='invalid-token', expected=401)
request('POST', '/api/auth/login', {'username': 'simon', 'password': 'wrong'}, expected=401)
request('POST', '/api/auth/login', {}, expected=400)
login = request('POST', '/api/auth/login', {'username': 'simon', 'password': 'Demo123!'})
token = login['token']
assert len(token.split('.')) == 3
request('GET', '/api/tasks', token=token)
request('POST', '/api/tasks', {'title': '   '}, token, expected=400)
created_ids = []
try:
    task = request('POST', '/api/tasks', {'title': ' API test ' + str(uuid.uuid4())}, token, 201)
    created_ids.append(task['id'])
    assert task['title'] == task['title'].strip()
    assert not task['isCompleted']
    assert any(item['id'] == task['id'] for item in request('GET', '/api/tasks', token=token))
    for completed in [True, False]:
        task['isCompleted'] = completed
        updated = request('PUT', f"/api/tasks/{task['id']}", task, token)
        assert updated['isCompleted'] == completed
        saved = next(item for item in request('GET', '/api/tasks', token=token) if item['id'] == task['id'])
        assert saved['isCompleted'] == completed
    request('DELETE', f"/api/tasks/{task['id']}", token=token, expected=204)
    created_ids.remove(task['id'])
    assert all(item['id'] != task['id'] for item in request('GET', '/api/tasks', token=token))
    request('PUT', f"/api/tasks/{task['id']}", task, token, 404)
    request('DELETE', f"/api/tasks/{task['id']}", token=token, expected=404)
    new_task = request('POST', '/api/tasks', {'title': 'ID test'}, token, 201)
    created_ids.append(new_task['id'])
    assert new_task['id'] > task['id'], 'IDs must not be reused after deletion'
    ids = [item['id'] for item in request('GET', '/api/tasks', token=token)]
    assert len(ids) == len(set(ids))
finally:
    for task_id in created_ids:
        request('DELETE', f'/api/tasks/{task_id}', token=token, expected=204)
print('PASS: login, JWT, protected GET/POST/PUT/DELETE, 400, 401, 404, unique IDs and cleanup')
