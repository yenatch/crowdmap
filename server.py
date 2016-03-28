"""Run from the parent directory."""

import SimpleHTTPServer
import SocketServer
import json
import os
import imp
import argparse

def import_module(module_name):
	path = os.path.join(os.path.dirname(__file__), module_name + '.py')
	return imp.load_source(module_name, path)

class Handler(SimpleHTTPServer.SimpleHTTPRequestHandler):

	# yuge speedup
	def address_string(self):
		return self.client_address[0]

	def do_POST(self):
		"""
		Receives json and runs a command if applicable.
		Ignores the path.
		"""
		length = int(self.headers.getheader('content-length'))
		data = self.rfile.read(length)

		# stupid hack to get past filler
		boundary = data.split()[0]
		data = data.split(boundary)[1]
		data = data[data.find('\r\n\r\n')+4:]

		parsed_data = json.loads(data)

		commands = import_module('commands')
		commands.main(parsed_data)

		self.wfile.write('ok')
		print '"POST {}"'.format(self.path)

def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('port', nargs='?', default='8000')
	args = ap.parse_args()
	port = int(args.port)
	try:
		httpd = SocketServer.TCPServer(("", port), Handler)
		print "serving at port", port
		httpd.serve_forever()
	except KeyboardInterrupt:
		print 'port', port, 'closed'

if __name__ == '__main__':
	main()
