package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/Preetam/siesta"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

func main() {
	addr := flag.String("addr", "localhost:4030", "Listen address")
	s3Key := flag.String("s3-key", "", "S3 access key")
	s3Secret := flag.String("s3-secret", "", "S3 secret access key")
	s3Region := flag.String("s3-region", "nyc3", "S3 region")
	s3Endpoint := flag.String("s3-endpoint", "https://nyc3.digitaloceanspaces.com", "S3 endpoint")
	flag.Parse()

	s3Service := s3.New(session.New(aws.NewConfig().
		WithRegion(*s3Region).
		WithEndpoint(*s3Endpoint).
		WithCredentials(credentials.NewStaticCredentials(*s3Key, *s3Secret, ""))))

	objectStore := &s3ObjectStore{s3: s3Service, bucket: "explains", contentType: "application/json", grantRead: "public-read"}
	http.Handle("/", NewAPI(objectStore).Service())
	log.Fatal(http.ListenAndServe(*addr, nil))
}

type API struct {
	os ObjectStore
}

func NewAPI(os ObjectStore) *API {
	return &API{
		os: os,
	}
}

// Service returns a siesta service for the API.
func (api *API) Service() *siesta.Service {
	APIService := siesta.NewService("/api/v1/")
	APIService.Route("OPTIONS", "/explains", "handles CORS preflight", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Method", "POST")
		w.Header().Set("Access-Control-Allow-Headers", r.Header.Get("Access-Control-Request-Headers"))
	})
	APIService.Route("POST", "/explains", "creates an explain object", api.CreateExplain)
	APIService.Route("GET", "/explains/:objectName", "gets an explain object", api.GetExplain)
	return APIService
}

func (api *API) CreateExplain(c siesta.Context, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	const maxSize = 16000

	explain := map[string]interface{}{}
	err := json.NewDecoder(r.Body).Decode(&explain)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	buf := &bytes.Buffer{}
	enc := json.NewEncoder(buf)
	enc.SetEscapeHTML(false)
	err = enc.Encode(explain)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if buf.Len() > maxSize {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	hash := sha1.Sum(buf.Bytes())
	objectName := fmt.Sprintf("%x.json", hash)

	err = api.os.PutObject(objectName, bytes.NewReader(buf.Bytes()), int64(len(buf.Bytes())))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"object": objectName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (api *API) GetExplain(c siesta.Context, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var params siesta.Params
	objectName := params.String("objectName", "", "name of explain")
	err := params.Parse(r.Form)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	or, err := api.os.GetObject(*objectName)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	explain := map[string]interface{}{}

	err = json.NewDecoder(or).Decode(&explain)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"explain": explain,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
