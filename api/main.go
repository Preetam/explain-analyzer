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

	objectStore := &s3ObjectStore{s3: s3Service, bucket: "explains"}
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
	APIService.Route("POST", "/explains", "creates an explain object", api.CreateExplain)
	return APIService
}

func (api *API) CreateExplain(c siesta.Context, w http.ResponseWriter, r *http.Request) {
	const maxSize = 16000

	explain := map[string]interface{}{}
	err := json.NewDecoder(r.Body).Decode(&explain)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	marshaled, err := json.Marshal(explain)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	hash := sha1.Sum(marshaled)
	objectName := fmt.Sprintf("%x.json", hash)

	err = api.os.PutObject(objectName, bytes.NewReader(marshaled), int64(len(marshaled)))
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
