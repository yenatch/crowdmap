"""Run from the parent directory."""

try:
	from http.server import SimpleHTTPRequestHandler
	from socketserver import TCPServer
except:
	from SimpleHTTPServer import SimpleHTTPRequestHandler
	from SocketServer import TCPServer

try:
	FileNotFoundError
except NameError:
	FileNotFoundError = IOError

import json
import os
import imp
import argparse
import sys

if sys.platform == 'cygwin':
	os.environ.setdefault('BROWSER', 'cygstart')
import webbrowser

def import_module(module_name):
	path = os.path.join(os.path.dirname(__file__), module_name + '.py')
	return imp.load_source(module_name, path)

class Handler(SimpleHTTPRequestHandler):

	def address_string(self):
		"""
		Faster than resolving the address every time (it's always localhost).
		"""
		return self.client_address[0]

	def do_POST(self):
		"""
		Given json, run a command. The path is ignored.
		"""
		#print ('"POST {}"'.format(self.path))

		length = int(self.headers.getheader('content-length'))
		data = self.rfile.read(length)

		# stupid hack to get past filler
		boundary = data.split()[0]
		data = data.split(boundary)[1]
		data = data[data.find('\r\n\r\n')+4:]

		result = {}
		try:
			parsed_data = json.loads(data)
			print (data.strip())
			commands = import_module('commands')
			result_data = commands.main(parsed_data)
			if result_data is not None:
				result['data'] = result_data
			self.send_response(200)

		except FileNotFoundError as e:
			print (e)
			result['error'] = str(e)
			self.send_response(404)

		except Exception as e:
			print (e)
			result['error'] = str(e)
			self.send_response(500)

		self.send_header("Content-type", "application/json")
		self.end_headers()

		response = json.dumps(result)
		try:
			response = bytes(response, 'utf-8')
		except:
			response = response.encode('utf-8')

		self.wfile.write(response)

def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('port', nargs='?', type=int, default='8000')
	args = ap.parse_args()

	port = args.port
	try:
		httpd = TCPServer(("", port), Handler)
		url = 'http://127.0.0.1:{}/crowdmap'.format(port)
		print ("Open this url in your browser: {}".format(url))
		webbrowser.open_new(url)
		httpd.serve_forever()

	except KeyboardInterrupt:
		print ('port {} closed'.format(port))

if __name__ == '__main__':
	main()
