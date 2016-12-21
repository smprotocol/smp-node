//
// Chunk Stream Parser for SMP (Streaming Message Protocol) in C++, 'fastparser'.
//
// Version: 0.0.1
// Author: Mark W. B. Ashcroft (mark [at] fluidecho [dot] com)
// License: MIT or Apache 2.0.
//
// Copyright (c) 2015 Mark W. B. Ashcroft.
// Copyright (c) 2015 FluidEcho.
//

// TODO:
// - make faster!
// - in switch state 5 (arg payload) count arglen forward in chunks rather than c++.
// - rather then return references to the smp.events, return the actual nodejs Buffer.
// - memory managment, make sure not leeking!
// - catch errors
// - other smp event types, eg: info.


#include <string.h>
#include <string>
#include <stdio.h>
#include <node.h>
#include <node_buffer.h>
#include <v8.h>
#include <vector>
//#include <nan.h>


namespace fastparser {

	using v8::Exception;
	using v8::FunctionCallbackInfo;
	using v8::Isolate;
	using v8::Local;
	using v8::Number;
	using v8::Object;
	using v8::String;
	using v8::Value;
	using v8::Array;
	using v8::Integer;
	using v8::Uint32;
	//using v8::Boolean;

	using namespace node;
	using namespace std;
	//using namespace Nan;

	// variables held accros multiple chunk calls.
	static int state = 0;		// 0 = start, 1 = sn, 2 = id, 3 = frame#, 4 = arglength, 5 = argpayload.
	//static bool more = false;
	static int x;
	static uint16_t arglen = 0;	
	static int argsc[15];		// cant have more than 0:15 args in a smp.event.
	
	static int ca, cz;
	static uint32_t sn = 0;
	static short flag, argc, _argc, _argsc;		// nimbles.	

	static int trailing = 0;
	static int remaining = 0;

	static vector<int> 
	row(short flag, short argc, uint32_t sn, int ca, int cz, int *argsc) {
		//printf("%s \n", "rowFn");
	
		vector<int> row; // Create an new empty row
		for (int col = 0; col < 20; col++) {		// 21 COLS: FLAG, ARGC, SN, CA, CZ, ARGC-0, ..., ARGC-15
		
			switch (col) {
			
				// FLAG
				case 0:		
				row.push_back(flag); 	// Add an element (column) to the row
				break;

				// ARGC
				case 1:		
				row.push_back(argc); 	// Add an element (column) to the row
				break;
			
				// SN
				case 2:		
				row.push_back(sn); 	// Add an element (column) to the row
				break;
			
				// CA
				case 3:		
				row.push_back(ca); 	// Add an element (column) to the row
				break;
			
				// CZ
				case 4:		
				row.push_back(cz); 	// Add an element (column) to the row
				break;									
			
				// ARGC-0
				case 5:		
				row.push_back(argsc[0]); 	// Add an element (column) to the row
				break;

				// ARGC-1
				case 6:		
				row.push_back(argsc[1]); 	// Add an element (column) to the row
				break;
			
				// ARGC-2
				case 7:		
				row.push_back(argsc[2]); 	// Add an element (column) to the row
				break;
			
				// ARGC-3
				case 8:		
				row.push_back(argsc[3]); 	// Add an element (column) to the row
				break;
			
				// ARGC-4
				case 9:		
				row.push_back(argsc[4]); 	// Add an element (column) to the row
				break;
			
				// ARGC-5
				case 10:		
				row.push_back(argsc[5]); 	// Add an element (column) to the row
				break;

				// ARGC-6
				case 11:		
				row.push_back(argsc[6]); 	// Add an element (column) to the row
				break;
			
				// ARGC-7
				case 12:		
				row.push_back(argsc[7]); 	// Add an element (column) to the row
				break;
			
				// ARGC-8
				case 13:		
				row.push_back(argsc[8]); 	// Add an element (column) to the row
				break;
			
				// ARGC-9
				case 14:		
				row.push_back(argsc[9]); 	// Add an element (column) to the row
				break;
			
				// ARGC-10
				case 15:		
				row.push_back(argsc[10]); 	// Add an element (column) to the row
				break;

				// ARGC-11
				case 16:		
				row.push_back(argsc[11]); 	// Add an element (column) to the row
				break;
			
				// ARGC-12
				case 17:		
				row.push_back(argsc[12]); 	// Add an element (column) to the row
				break;
			
				// ARGC-13
				case 18:		
				row.push_back(argsc[13]); 	// Add an element (column) to the row
				break;
			
				// ARGC-14
				case 19:		
				row.push_back(argsc[14]); 	// Add an element (column) to the row
				break;
		
				// ARGC-15
				case 20:		
				row.push_back(argsc[15]); 	// Add an element (column) to the row
				break;	
													
			}
		
		}	
	
		return row;
	
	}
	
	
	//static int chunknums = 0;		// TODO: delete this, for debug
	

	// recieves chunks from JS.
	//void Parse(const Nan::FunctionCallbackInfo<v8::Value>& args) {
	void Parse(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();

		Local<Object> bufferObj = args[0]->ToObject();
		//static char* chunk = Buffer::Data(bufferObj);
		
		uint8_t* chunk = (uint8_t*) Buffer::Data(bufferObj);
		
		int chunkLength = Buffer::Length(bufferObj);

		//chunknums++;

		//printf("chunkLength: %u\n", chunkLength);
		//printf("chunk : %s\n", chunk);
		
		//printf("new chunk state: %u\n", state);
		//printf("new chunk x: %u\n", x);
		//printf("new chunk arglen: %u\n", arglen);

		vector< vector<int> > events;		// array(like) of smp.event items to return.

		
		ca = 0; cz = 0;
		//int _c = trailing;		// c+ adjusted to trailing.
		if ( trailing > 0 ) {
			//ca = 0;
			//c = 1;
			
		}
		trailing = chunkLength;
		
		
		int c;		// actual pointer for this chunk.
		for( c = 0; c < chunkLength; c++ ) {
			
			
			//printf("c : %u\n", c);
			//printf("chunk[c] : %u\n", chunk[c]);


			//unsigned int uci = chunk->Get(chunk[c])->Uint32Value();
			
			//unsigned int uci = bufferObj[c]->Uint32Value();
			
			//ptr = (MyType*) &((char*) buffer->GetIndexedPropertiesExternalArrayData())[offset]
			
			//int ci = (int)chunk[c];
			//printf("uci : %u\n", uci);
			
			// TODO: if last c in this chunk and this is trailing event, return as trailing
			
			
			switch (state) {
				case 0:		// start
			
					flag = chunk[c] >> 4;
					argc = chunk[c] & 0xf;
					_argc = argc;
					_argsc = 0;

					//printf("flag: %u\n", flag);
					//printf("argc: %u\n", argc);
				
				/*
					if ( chunknums == 2 ) {
						printf("%s \n", "message START");
						printf("flag: %u\n", flag);
						printf("argc: %u\n", argc);
						printf("c : %u\n", c);
						printf("chunk[c] : %u\n", chunk[c]);
					}
				*/
				
					ca = c;
				
					x = 0;
					state = 1;
				
					break;
				
				case 1:		// sn.

					x++;

					if ( x == 1 ) {
						sn = chunk[c] << 24;
					}
					if ( x == 2 ) {
						sn += chunk[c] << 16;
					}
					if ( x == 3 ) {
						sn += chunk[c] << 8;
					}
					if ( x == 4 ) {
						sn += chunk[c];
					}			

					if ( 4 == x ) {
						x = 0;
				    if ( flag == 1 || flag == 2 || flag == 3 ) {
				      state = 2;	// id
				    } else {
				      state = 4;	// len
				    }
				  }

				  break;

				case 4:		// arg length.				
				
					x++;
					
					if ( x == 1 ) {
						arglen = chunk[c] << 8;
					}
					if ( x == 2 ) {
						arglen += chunk[c];				
					}
					
					if ( 2 == x ) {
				
						//printf("arglen: %u\n", arglen);
				
						argsc[_argsc++] = arglen;
						x = 0;
						_argc--;
				
		        if ( arglen == 0 ) {  

		          if ( _argc == 0 ) {
								//printf("%s \n", "form MESSAGE");

								cz = c + 1;
								trailing -= (cz - ca);
								events.push_back(row(flag, argc, sn, ca, cz, argsc)); 	// Add the row to the main vector
								flag = 0;
								argc = 0;
								sn = 0;
								_argsc = 0;								
		            state = 0;   // start     
		            break;              
		          }
		          state = 4;		// arg length.	
		        } else {
		          state = 5;		// arg payload.
		        }
				
					}
				
					break;

				case 5:		// arg payload.

					x++;
				
					//printf("x: %u\n", x);
					//printf("arglen: %u\n", arglen);
				
					if ( x == arglen ) {
						//printf("%s \n", "arg payload at arglen");
						arglen = 0;
						x = 0;
						if ( _argc == 0 ) { 
							//printf("%s \n", "form MESSAGE");
							/*
								if ( chunknums == 2 ) {
									printf("%s \n", "form MESSAGE, chunknums 2");
									printf("c: %u\n", c);
									printf("chunk[c] : %u\n", chunk[c]);
									
									printf("chunk[0] : %u\n", chunk[0]);
									printf("chunk[1] : %u\n", chunk[1]);
									printf("chunk[2] : %u\n", chunk[2]);
									printf("chunk[3] : %u\n", chunk[3]);
									printf("chunk[4] : %u\n", chunk[4]);
									printf("chunk[5] : %u\n", chunk[5]);
									printf("chunk[6] : %u\n", chunk[6]);
									printf("chunk[7] : %u\n", chunk[7]);
									printf("chunk[8] : %u\n", chunk[8]);
									printf("chunk[9] : %u\n", chunk[9]);
								
									
									
									int f = c;
									for ( f = c; f < 250; f++ ) {
									
										//std::string fs = std::to_string(f);
										//std::string valst = "argc_" + ws;
										printf("f : %u\n", f);
										printf("chunk[f] : %u\n", chunk[f]);
									}
																					
								}			
								*/				
							
							cz = c + 1;
							trailing -= (cz - ca);
							events.push_back(row(flag, argc, sn, ca, cz, argsc)); 	// Add the row to the main vector
							//cz = 0;
							flag = 0;
							argc = 0;
							sn = 0;
							_argsc = 0;
							state = 0;	// start
						} else {
							state = 4;	// arg length
						}
					}
				
					break;
		
			}

		}



		// CONVERT vector to V8::Array -------------------------
		//printf("events : %u\n", events.size());

		// JS array []:
		//Local<Array> eventsArray = Array::New(isolate, events.size());		// 1 = array items
		Local<Array> eventsArray = Array::New(isolate, events.size());		// 1 = array items

		eventsArray->Set( String::NewFromUtf8(isolate, "trailing"), Integer::New(isolate, trailing) );
		
		remaining = arglen - x;
		eventsArray->Set( String::NewFromUtf8(isolate, "remaining"), Integer::New(isolate, remaining) );



// THIS IS SHIT SLOW !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		for(size_t i = 0; i < events.size(); ++i) {

			// JS object {}:
			Local<Object> event = Object::New(isolate);

			int argcx = 0;
	
			for(size_t col = 0; col < 20; ++col) {

				switch (col) {
			
					// FLAG
					case 0:		
					//event->Set( String::NewFromUtf8(isolate, "flag"), Integer::New(isolate, events[i][col]) );
					break;
	
					// ARGC
					case 1:
					argcx = events[i][col];
					//event->Set( String::NewFromUtf8(isolate, "argc"), Integer::New(isolate, argcx) );
					break;
			
					// SN
					case 2:		
					//event->Set( String::NewFromUtf8(isolate, "sn"), Integer::New(isolate, events[i][col]) );
					break;
			
					// CA
					case 3:		
					//event->Set( String::NewFromUtf8(isolate, "ca"), Integer::New(isolate, events[i][col]) );
					break;
			
					// CZ
					case 4:		
					//event->Set( String::NewFromUtf8(isolate, "cz"), Integer::New(isolate, events[i][col]) );
					break;									
			
					// ARGC-0
					case 5:
					if ( argcx == 0 ) {
						break;
					}
					//event->Set( String::NewFromUtf8(isolate, "argc_0"), Integer::New(isolate, events[i][col]) );
					break;

					// ARGC-1
					case 6:
					if ( argcx <= 1 ) {
						break;
					}			
					//event->Set( String::NewFromUtf8(isolate, "argc_1"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-2
					case 7:
					if ( argcx <= 2 ) {
						break;
					}			
					//event->Set( String::NewFromUtf8(isolate, "argc_2"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-3
					case 8:
					if ( argcx <= 3 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_3"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-4
					case 9:
					if ( argcx <= 4 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_4"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-5
					case 10:
					if ( argcx <= 5 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_5"), Integer::New(isolate, events[i][col]) );
					break;

					// ARGC-6
					case 11:
					if ( argcx <= 6 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_6"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-7
					case 12:
					if ( argcx <= 7 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_7"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-8
					case 13:
					if ( argcx <= 8 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_8"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-9
					case 14:
					if ( argcx <= 9 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_9"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-10
					case 15:
					if ( argcx <= 10 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_10"), Integer::New(isolate, events[i][col]) );
					break;

					// ARGC-11
					case 16:
					if ( argcx <= 11 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_11"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-12
					case 17:
					if ( argcx <= 12 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_12"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-13
					case 18:
					if ( argcx <= 13 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_13"), Integer::New(isolate, events[i][col]) );
					break;
			
					// ARGC-14
					case 19:
					if ( argcx <= 14 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_14"), Integer::New(isolate, events[i][col]) );
					break;
		
					// ARGC-15
					case 20:
					if ( argcx <= 15 ) {
						break;
					}					
					//event->Set( String::NewFromUtf8(isolate, "argc_15"), Integer::New(isolate, events[i][col]) );
					break;	
					/**/
				}
					
											
			}	
	
	
	
	/*
	
			// convert V8 arc# objects into V8::Array
			Local<Array> argscArray = Array::New(isolate, argcx);

			uint32_t argcxx = event->Get(String::NewFromUtf8(isolate, "argc"))->Uint32Value();	// THIS PART IS SHIT SLOW !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	
			//printf("argcxx : %u\n", argcxx);
	
			uint32_t w = 0;
			for ( w = 0; w < argcxx; w++ ) {
		
				std::string ws = std::to_string(w);
				std::string valst = "argc_" + ws;
				const char * valchar = valst.c_str();
		
				argscArray->Set(w, Integer::New(isolate, event->Get(String::NewFromUtf8(isolate, valchar))->Uint32Value()));
		
				// delete the argc_# item, no longer need.
				event->Delete(String::NewFromUtf8(isolate, valchar));
	
			}
	
			event->Set( String::NewFromUtf8(isolate, "argsc"), argscArray );
			eventsArray->Set(i, event);
	
		
*/

	}


		//printf("return event list, state: %u\n", state);
		//x = trailing;		// override.
		//printf("return event list, x: %u\n", x);

		args.GetReturnValue().Set( eventsArray );		// return results back to JS.
		
	}


	//void Init(v8::Local<v8::Object> exports) {
	void Init(Local<Object> exports) {
		NODE_SET_METHOD(exports, "parse", Parse);
		
	//exports->Set(Nan::New("parse").ToLocalChecked(),
		            //Nan::New<v8::FunctionTemplate>(Parse)->GetFunction());  
		
	}

	NODE_MODULE(fastparser, Init)

}  // namespace fastparser

